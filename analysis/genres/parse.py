import ast
import csv

from .schema import Schema



#
# Parsing
#


def build_genre_schema(filename):

  schema = Schema()

  with open(filename, 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file, delimiter='\t')
    for line in reader:
      if not line['RAW']:
        continue
      if line['REPLACE']:
        schema.add_replacement(line['RAW'], line['REPLACE'])
      else:
        if line['PARENT'] == '/': line['PARENT'] = None
        if line['PARENT'] == '': continue
        schema.add_to_schema(
          line['RAW'],
          parent       = line['PARENT'],
          display_name = line['DISPLAY'],
          alt_parents  = [ x.strip() for x in line['ALT_PARENT'].split(',') ] or None,
          hidden       = line['?'] == '#'
        )

  schema._compute_leaf_nodes()
  return schema


def count_schema_values(filename, schema):
  with open(filename, 'r', encoding='utf-8') as file:
    reader = csv.reader(file, delimiter='\t')

    for idx, line in enumerate(reader):
      try:
        genre_list = ast.literal_eval(line[1])
      except:
        print(f'failed to parse line {idx}')
        continue

      if genre_list:
        try:
          weight = int(line[4])
        except:
          weight = 0
        schema.update_count(genre_list, weight=weight)
