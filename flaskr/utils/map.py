from collections.abc import Mapping, MutableMapping



def traverse_mapping(obj, terminate = None):
  '''
    Traverse through nested fields in a mapping.
    Terminates recursion if `terminate` lambda evaluates to true.
  '''

  # Check the terminate condition
  if terminate and terminate(obj):
    yield tuple(), obj
    return
  
  # Check if the current object has items (i.e. can be traversed)
  try:
    items = obj.items()
  except:
    yield tuple(), obj
    return

  # Recurse on all the items of the object
  for key, val in items:
    yield from (
      ((key, *key_inner), val_inner)
        for key_inner, val_inner in traverse_mapping(val, terminate=terminate)
    )


def update_recursive(obj, path, update):
  '''
    Apply an update function to a nested field in a traversable object.
    Creates empty dict layers as needed.
  '''

  # Base case
  if not len(path):
    return update(obj)

  # Ensure next layer exists
  if obj is None:
    obj = {}

  # Update recursively & return
  obj.update({
    path[0]: update_recursive( obj.get(path[0]), path[1:], update )
  })
  return obj



class FallbackDict(MutableMapping):
  '''
    A mapping with a pre-defined keyset that uses one of its key values as a fallback for other keys in the set.
  '''

  def __init__(self, fallback_key, initial_keyset=None):
    self._fallback_key = fallback_key
    self._keyset = {fallback_key, *(initial_keyset or {})}
    self._dict = {}

  def __repr__(self):
    return f'{self.__class__.__name__}({repr(self._fallback_key)}, {repr(self._dict)})'

  def set_key(self, key, val):
    self.add_keys(key)
    self[key] = val

  def add_keys(self, *new_keys):
    self._keyset.update(set(new_keys))

  @property
  def fallback_key(self):
    return self._fallback_key

  def __getitem__(self, __key):
    if __key not in self._keyset:
      raise KeyError(f'Cannot get key "{__key}": not in keyset {self._keyset}')
    try:
      return self._dict.__getitem__(__key)
    except KeyError:
      return self._dict.__getitem__(self._fallback_key)

  def __setitem__(self, __key, __val):
    if __key not in self._keyset:
      raise KeyError(f'Cannot set key "{__key}": not in keyset {self._keyset}')
    return self._dict.__setitem__(__key, __val)
  
  def __delitem__(self, __key):
    if __key not in self._keyset:
      raise KeyError(f'Cannot delete key "{__key}": not in keyset {self._keyset}')
    if __key == self._fallback_key:
      raise KeyError(f'Cannot delete default key "{__key}"')
    return self._dict.__delitem__(__key)

  def __iter__(self):
    yield from self._keyset

  def __len__(self):
    return self._dict.__len__()



class ConfigMap(Mapping):

  def __init__(self, fallback_key, initial_keyset = None):
    self._dict         = {}
    self._fallback_key = fallback_key
    self._keyset       = initial_keyset or set()


  def __getitem__(self, path):

    # If path is a string, separate it by periods
    if isinstance(path, str):
      path = path.split('.')

    # Recurse down the structure
    temp = self._dict
    for idx, p in enumerate(path):
      if isinstance(temp, str) or isinstance(temp, FallbackDict):
        raise KeyError(f'{self.__class__.__name__} attribute "{ ".".join(path[:idx+1]) }" is not a compound field')
      try:
        temp = temp[p]
      except KeyError:
        raise KeyError(f'{self.__class__.__name__} object has no attribute "{ ".".join(path[:idx+1]) }"') from None

    # Return the final value    
    return temp
  

  def __iter__(self):
    yield from traverse_mapping(self._dict, terminate=lambda field: isinstance(field, FallbackDict))


  def __len__(self):
    return len(self._keyset) # TODO: This should probably count the number of paths, instead of the bottom-level keys


  def set(self, key, path, val):
    def __update(obj):
      if obj is None:
        obj = FallbackDict(self._fallback_key, initial_keyset=self._keyset)
      obj.set_key(key, val)
      return obj

    if isinstance(path, str):
      path = path.split('.')

    update_recursive(self._dict, path, __update)


  def read(self, key, mapping):
    '''
      Read in a mapping and update the internal dict accordingly.
    '''

    # Make sure the new language is in the keyset of all LangText objects
    self._ensure_key_exists(key)

    # Recursively traverse the object & set each path with the given key
    for path, val in traverse_mapping(mapping):
      self.set(key, path, val)


  def _ensure_key_exists(self, key):
    if key not in self._keyset:
      self._keyset.add(key)
      for _, val in self:
        val.add_keys(key)
