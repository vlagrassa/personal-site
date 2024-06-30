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

  @property
  def lineType(self):
    return self.__class__.__name__


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
    return ((k, v.strip()) for (k, v) in self._text.items())

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




class DocumentSection(DocumentLine):

  @classmethod
  def make_empty(cls):
    return DocumentSection(None)

  def __init__(self, id_: str, show: bool = True):
    self.id    : str                = id_
    self.show  : bool               = show
    self.level : int                = 0
    self.head                       = {}
    self.body  : List[DocumentLine] = []

    self.current_section: DocumentSection = self

  def __iter__(self):
    return (b for b in self.body)

  def add_title(self, text, lang=None, level=None):
    self.current_section.level        = level
    self.current_section.head[ lang ] = text


  def get_line(self, class_, *args, **kwargs):
    if not len(self.current_section.body) or not isinstance(self.current_section.body[-1], class_):
      self.current_section.body.append( class_(*args, **kwargs) )
    return self.current_section.body[-1]

  def add_line(self, v):
    if len(self.current_section.body) and self.current_section.body[-1].is_empty:
      self.current_section.body = self.current_section.body[:-1]
    self.current_section.body.append(v)


  def add_text(self, text, lang=None):

    current_line = self.current_section.get_line(DocumentLineText)

    if current_line.finished_lang(lang):
      current_line = DocumentLineText()
      self.current_section.add_line( current_line )

    current_line.add_line(text, lang=lang)


  def add_insert(self, name):
    self.add_line( DocumentLineInsert(name) )


  def add_subsection(self, section):
    self.current_section = section
    self.body.append(self.current_section)


  def parsing_subsection(self):
    return self != self.current_section


  def is_empty(self):
    return all( item.is_empty() for item in self.body )


  def is_text(self):
    return True




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

    elif line.startswith('!subsection'):
      self.parse_subsection(line)

    elif line.startswith('#'):
      self.parse_title(line)

    elif line.startswith('!insert'):
      self.parse_insert(line)

    else:
      self.parse_text(line)


  def parse_section(self, line):
    if line.startswith('!section-notitle'):
      show = False
      line = line[len('!section-notitle'):]
    else:
      show = True
      line = line[len('!section '):]
    self.latest_section = DocumentSection(line.strip(), show=show)

  def parse_subsection(self, line):
    if line.startswith('!subsection-notitle'):
      show = False
      line = line[len('!subsection-notitle'):]
    else:
      show = True
      line = line[len('!subsection '):]
    self.latest_section.add_subsection( DocumentSection(line.strip(), show=show) )

  def parse_title(self, line):
    r = re.match(r'^(#+) +\[([a-z]+)\] +(.*)$', line)
    self.latest_section.add_title(r.group(3), lang=r.group(2), level=len(r.group(1)) - 1)


  def parse_text(self, line):
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
