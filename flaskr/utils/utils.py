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


def dateformat(value: datetime.date, lang=None, limit: int = None) -> str:
  '''
    Format a date as a human-readable string, using special values for "yesterday", etc.
    If no `lang` provided, formats using numbers only.
  '''

  # Map language identifiers to relevant words & default format
  # Integer indices represent number of days since current day (negative for past)
  # Default is a function mapping an arbitrary date to a standard format
  DATE_MAP = {
    'en': {
      0:  'today',
      -1: 'yesterday',
      'numeric': lambda n: f'{-n}d ago',
      'default': lambda dt: dt.strftime('%b\u00A0%d, %Y')
    },
    'ja': {
      0:  '今日',
      -1: '昨日',
      -2: '一昨日',
      'numeric': lambda n: f'{-n}日前',
      'default': lambda dt: nb(str(dt.year) + '年') + nb(f'{dt.month}月{dt.day}日')
    },
  }

  # Default format (no lang) -- plain date without words
  # Insert a zero-width space between month/date and year to put linebreak there
  DEFAULT_FORMAT = lambda dt: dt.strftime('%m/%d/') + '\u200B' + dt.strftime('%Y')

  # Invalid value
  if value is None:
    return '???'

  # Get the config object from the map
  date_config = DATE_MAP.get(lang)
  if date_config is None:
    return DEFAULT_FORMAT(value)

  # Get number of days between target date and current date
  day_diff = (value - datetime.date.today()).days

  if limit is not None and abs(day_diff) <= limit:
    if   day_diff  in date_config: return date_config[day_diff]
    elif 'numeric' in date_config: return date_config['numeric'](day_diff)
    elif 'default' in date_config: return date_config['default'](value)
    else: return DEFAULT_FORMAT(value)

  # If difference present in config, use it, otherwise apply the default function to the date value
  return date_config.get( day_diff, date_config.get('default', DEFAULT_FORMAT)(value) )
