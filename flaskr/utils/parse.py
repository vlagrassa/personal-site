from   abc    import ABC, abstractmethod
from   flask  import current_app
import re
from   typing import List



class DocumentLine(ABC):
  @property
  @abstractmethod
  def is_text(self): pass

  @property
  @abstractmethod
  def is_empty(self): pass


class DocumentLineInsert(DocumentLine):
  def __init__(self, name):
    self.name = name

  @property
  def is_text(self): return False

  @property
  def is_empty(self): return False



class DocumentLineText(DocumentLine):
  DEFAULT_LANG = 'en'

  def __init__(self):
    self._text = {}
    self._last_lang = None

  def __iter__(self):
    return ((k, v) for (k, v) in self._text.items())

  def __getitem__(self, l):
    return self._text.get(l, '').strip()

  def __setitem__(self, l, t):
    self._text[l] = t

  def __contains__(self, l):
    if l is None: return False
    return l in self._text

  def add_line(self, text, lang=None):
    self._last_lang = lang or self._last_lang or self.DEFAULT_LANG
    self[self._last_lang] += '\n' + text.strip()

  def finished_lang(self, l):
    return l in self and not self._last_lang == l

  @property
  def is_text(self):
    return True

  @property
  def is_empty(self):
    for l, t in self:
      if len(t.strip()): return False
    return True




class DocumentSection():

  @classmethod
  def make_empty(cls):
    return DocumentSection(None)

  def __init__(self, id_: str, show: bool = True):
    self.id    : str                = id_
    self.show  : bool               = show
    self.level : int                = 0
    self.head                       = {}
    self.body  : List[DocumentLine] = []

  def __iter__(self):
    return (b for b in self.body)

  def add_title(self, text, lang=None, level=None):
    self.level        = level
    self.head[ lang ] = text


  def get_line(self, class_, *args, **kwargs):
    if not len(self.body) or not isinstance(self.body[-1], class_):
      self.body.append( class_(*args, **kwargs) )
    return self.body[-1]

  def add_line(self, v):
    if len(self.body) and self.body[-1].is_empty:
      self.body = [ *self.body[:-1], v ]
    else:
      self.body.append(v)


  def add_text(self, text, lang=None):

    current_line = self.get_line(DocumentLineText)

    if current_line.finished_lang(lang):
      current_line = DocumentLineText()
      self.add_line( current_line )

    current_line.add_line(text, lang=lang)


  def add_insert(self, name):
    self.add_line( DocumentLineInsert(name) )




class TextDocument():
  sections: List[DocumentSection] = []

  def __init__(self):
    self.sections = []

  def __iter__(self):
    return (s for s in self.sections)


  @property
  def latest_section(self):
    if not len(self.sections):
      self.sections.append( DocumentSection.make_empty() )
    return self.sections[-1]

  @latest_section.setter
  def latest_section(self, s):
    if len(self.sections) and self.sections[-1].id is None:
      self.sections = [ *self.sections[:-1], s ]
    else:
      self.sections.append( s )


  @staticmethod
  def parse_file(filename):
    doc = TextDocument()
    with current_app.open_resource(f'static/{filename}.md') as mkd:
      for line in mkd.readlines():
        doc.parse_line( line.decode('utf-8').strip() )
    return doc


  def parse_line(self, line):
    '''
      Redirect to the appropriate parsing function for this line.
    '''

    if line.startswith('!section'):
      self.parse_section(line)

    elif line.startswith('#'):
      self.parse_title(line)

    elif line.startswith('!insert'):
      self.parse_insert(line)

    else:
      self.parse_body(line)


  def parse_section(self, line):
    if line.startswith('!section-notitle'):
      show = False
      line = line[len('!section-notitle'):]
    else:
      show = True
      line = line[len('!section '):]
    self.latest_section = DocumentSection(line.strip(), show=show)


  def parse_title(self, line):
    r = re.match(r'^(#+) +\[([a-z]+)\] +(.*)$', line)
    self.latest_section.add_title(r.group(3), lang=r.group(2), level=len(r.group(1)) - 1)


  def parse_body(self, line):
    r = re.match(r'^\[([a-z]+)\]( +|$)', line)
    if r:
      self.latest_section.add_text(
        text = line[len(r.group(0)):],
        lang = r.group(1),
      )
    else:
      self.latest_section.add_text(line)


  def parse_insert(self, line):
    self.latest_section.add_insert( line[len('!insert '):] )




def parse_content_md(filename):

  # Initialize an empty section object
  # section = {
  #   'id':    None,
  #   'title': None,
  #   'level': 0,
  #   # 'code':  'preamble',
  #   'body':  [],
  # }
  section = None
  doc = TextDocument()

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
