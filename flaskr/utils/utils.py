import datetime


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


def dateformat(value: datetime, lang=None):
  '''
    Format a date as a human-readable string, using special values for "yesterday", etc.
    If no `lang` provided, formats using numbers only.
  '''
  today = datetime.datetime.today().date()

  # Invalid value
  if value is None or value == '':
    return '???'

  # Today
  if value == today:
    if lang == 'en': return 'today'
    if lang == 'ja': return '今日'

  # One day ago
  if value == today - datetime.timedelta(days=1):
    if lang == 'en': return 'yesterday'
    if lang == 'ja': return '昨日'

  # Two days ago
  if value == today - datetime.timedelta(days=2):
    if lang == 'ja': return '一昨日'

  # Default format for English
  if lang == 'en':
    return value.strftime('%b\u00A0%d, %Y')

  # Default format for Japanese
  if lang == 'ja':
    return nb(str(value.year) + '年') + nb(f'{value.month}月{value.day}日')

  # Default format (no lang) -- plain date without words
  # Insert a zero-width space between month/date and year to put linebreak there
  return value.strftime('%m/%d/') + '\u200B' + value.strftime('%Y')
