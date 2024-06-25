from flask_caching import Cache



CACHE = Cache(config={
  'CACHE_TYPE': 'SimpleCache',
})
