import os

from genres import run_analysis



#
# Main Function
#

if __name__ == '__main__':
  m = os.environ.get('ANALYZE_MODULE')
  if m == 'GENRES':
    run_analysis('genres/data/genre-schema.tsv', ['genres/data/spotify.tsv'], output_file='output/genre-results.json')
  else:
    print(f'Unrecognized analysis module "{m}"')
