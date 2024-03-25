from .schema import Schema
from .parse  import build_genre_schema, count_schema_values



def run_analysis(schema_file, value_files, *, output_file=None, audit=False):
  '''
    Primary analysis function.
  '''

  # Build the schema
  genre_schema = build_genre_schema(schema_file)

  # Count the values from the given file(s)
  for value_file in value_files:
    audit_report = count_schema_values(value_file, genre_schema, audit=audit)

    # Print out items belonging to a parent genre but none of its sub-genres
    if audit:
      for key, val in audit_report['stranded_parents'].items():
        print(f'{key} ({genre_schema._counts[key]})')
        for v in val:
          print(f'  - {v}')

  # Dump the schema to a JSON file, if desired
  if output_file:
    parsed = genre_schema.to_json_string()
    with open(output_file, mode='w', encoding='utf-8') as f:
      f.write(parsed)

  # Return the schema
  return genre_schema
