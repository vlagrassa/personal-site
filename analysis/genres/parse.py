import ast
import csv
from   collections import defaultdict

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

  return schema


def count_schema_values(filename, schema: Schema, *, audit=False):

  # Track items assigned to parent genres but none of their sub-genres
  if audit:
    parent_nodes  = { node['name'] for node in schema.traverse() if len(node['children']) }
    parent_counts = defaultdict(list)

  # Parse file
  with open(filename, 'r', encoding='utf-8') as file:
    reader = csv.reader(file, delimiter='\t')

    for idx, line in enumerate(reader):
      try:
        genre_list = ast.literal_eval(line[1])
      except:
        print(f'failed to parse line {idx}')
        continue

      if genre_list:

        if audit:
          for parent_node in parent_nodes:
            if check_stranded_parent(genre_list, parent_node, schema):
              parent_counts[parent_node].append(line[2])

        try:
          weight = int(line[4])
        except:
          weight = 0
        schema.update_count(genre_list, weight=weight)

  # If desired, return extra info on the run
  if audit:
    return {
      'stranded_parents': parent_counts
    }




#
# Helpers
#


def check_stranded_parent(genre_list, parent, genre_schema: Schema):
  mod_genre_list = genre_schema.clean_keyset(genre_list)
  if not parent in mod_genre_list:
    return False
  for g in mod_genre_list:
    if g != parent and genre_schema.is_parent(parent, g, loose=True):
      return False
  return True
