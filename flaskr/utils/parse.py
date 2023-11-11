from   flask import current_app
import re



def parse_content_md(filename):

  # Initialize an empty section object
  section = None

  # Loop through each line in the file
  with current_app.open_resource(f'static/{filename}.md') as mkd:
    for line in mkd.readlines():
      line = line.decode('utf-8').strip()

      # If line is a header, finish the previous section and start a new one
      if line.startswith('!section'):
        if section: yield section
        if line.startswith('!section-notitle'):
          show_title = False
          line = line[len('!section-notitle'):]
        else:
          show_title = True
          line = line[len('!section '):]
        section = {
          'id':    line.strip(),
          'show':  show_title,
          'level': 0,
          'title': {},
          'body':  [],
        }

      # Section header
      elif line.startswith('#'):

        r = re.match(r'^(#+) +\[([a-z]+)\] +(.*)$', line)

        section['level'] = len(r.group(1)) - 1
        section['title'][ r.group(2) ] = r.group(3)

      # Insert directive
      elif line.startswith('!insert'):
        if len(section['body']):
          section['body'][-1]['text'] = section['body'][-1]['text'].strip()
          if not section['body'][-1]['text']:
            section['body'].pop()

        section['body'].append({
          'insert': line[len('!insert '):],
        })

      # Otherwise, add this line onto the body of the current section
      else:
        if section:
          r = re.match(r'^\[([a-z]+)\]( +|$)', line)

          if r:
            if len(section['body']):
              section['body'][-1]['text'] = section['body'][-1]['text'].strip()
              if not section['body'][-1]['text']:
                section['body'].pop()

            section['body'].append({
              'lang': r.group(1),
              'text': line[len(r.group(0)):] + '\n',
            })

          else:
            if not len(section['body']) or section['body'][-1].get('text', None) is None:
              section['body'].append({
                'lang': 'en',
                'text': '',
              })
            section['body'][-1]['text'] += line + '\n'


    # Finish the final section
    # Check is to make sure at least one section was read
    if section['title'] or section['body']:
      yield section
