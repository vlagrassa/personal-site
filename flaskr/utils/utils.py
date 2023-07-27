def nb(txt):
  '''
    Intersperse a string with word joiner characters, to prevent line breaks within the string.
  '''
  return '\u2060'.join(txt)


def capsfirst(txt):
  '''
    Capitalize the first letter of a string.
  '''
  if len(txt) > 0:
    return txt[0].upper() + txt[1:]
  return txt
