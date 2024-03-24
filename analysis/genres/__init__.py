from .schema import Schema
from .parse  import build_genre_schema, count_schema_values



def run_analysis(schema_file, value_files, output_file=None):
  '''
    Primary analysis function.
  '''

  # Build the schema
  genre_schema = build_genre_schema(schema_file)

  # Count the values from the given file(s)
  for value_file in value_files:
    count_schema_values(value_file, genre_schema)

  # Dump the schema to a JSON file, if desired
  if output_file:
    parsed = genre_schema.to_json_string()
    with open(output_file, mode='w', encoding='utf-8') as f:
      f.write(parsed)

  # Return the schema
  return genre_schema
