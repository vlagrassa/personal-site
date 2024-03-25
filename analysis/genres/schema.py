from   collections import defaultdict
import json



class Schema():
  def __init__(self):
    self._replacements = {}
    self._schema       = self._create_node('root')
    self._backrefs     = {}
    self._counts       = defaultdict(float)
    self._visible      = {}
    self._alt_parents  = {}
    self._leftovers    = set()



  #
  # Update Schema Structure
  #


  def add_replacement(self, key, replace):
    '''
      Map instances of `key` to `replace`.
    '''
    self._replacements[key] = replace


  def add_to_schema(self, key, parent=None, display_name=None, alt_parents=None, hidden=False):
    '''
      Add a node for `child` to the schema.

      Args:
        `parent`: The parent to add the node to. If `None`, uses the root node.
        `display_name`: Optional alternative display name for the node.
    '''
    self._backrefs[key]    = parent
    self._visible[key]     = not hidden
    self._alt_parents[key] = alt_parents
    self._locate_node(parent)['children'][key] = self._create_node(key, display_name=display_name, hidden=hidden)



  #
  # Update Schema Values
  #


  def update_count(self, keys, weight=1):
    '''
      Update the count for one or more schema items.
      
      The set of items is cleaned up and merged down using the schema, then the `weight` value is distributed evenly across the resulting items.
    '''

    # Clean the keyset - map all keys to canonical versions
    clean_keyset = self.clean_keyset(keys)

    # Add all backrefs, so hidden keys still count toward their parents
    extras = set()
    for key in clean_keyset:
      extras.update(self.trace_ancestors(key))
    clean_keyset.update(extras)

    # Remove all parent keys and all hidden keys within the keyset
    clean_keyset = list(clean_keyset)
    parents = set()
    for i in range(len(clean_keyset)):
      for j in range(len(clean_keyset)):
        if i == j: continue
        if self.is_parent(clean_keyset[i], clean_keyset[j], loose=True):
          parents.add(clean_keyset[i])
    clean_keyset = { x for x in clean_keyset if x in self._visible and x not in parents }

    # Track untouched keys
    self._leftovers.update(set(self.clean_keyset(keys)) - clean_keyset)

    # If nothing is left, do nothing
    if not len(clean_keyset):
      return
    
    # Add the weights
    total_weight = weight / len(clean_keyset)
    for key in clean_keyset:
      self._counts[key] += total_weight



  #
  # Traversal
  #


  def traverse(self, parent_first=True):
    '''
      Traverse the schema.
    '''
    def _traverse(node):
      if parent_first: yield node
      for child in node['children'].values():
        yield from _traverse(child)
      if not parent_first: yield node
    yield from _traverse(self._schema)


  def trace_ancestors(self, key, include_self=False):

    # Make sure item is legitimate
    if key in self._replacements:
      key = self._replacements[key]
    if not key in self._backrefs:
      return None
    
    if include_self:
      yield key

    # Walk back up tree
    while key := self._backrefs[key]:
      yield key



  #
  # Clean Keys
  #

  def clean_key(self, key):
    return self._replacements.get(key.lower(), key.lower())

  def clean_keyset(self, keys):
    return set([ self.clean_key(key) for key in keys ])
  
  

  #
  # JSON
  #


  def _create_json(self, root=None):
    if root is None: root = self._schema

    count    = self._counts.get(root['name'])
    children = [ self._create_json(root=node) for node in root['children'].values() if not node['hidden'] ]

    d = { 'name': root.get('display', root['name']) }
    if count:         d['value'] = count
    if len(children): d['children'] = children

    return d


  def to_json_string(self):
    return json.dumps(self._create_json())



  #
  # Helpers: Nodes
  #


  @classmethod
  def _create_node(cls, name, display_name=None, hidden=False):
    return {
      'name': name,
      'display': display_name if display_name else name,
      'children': {},
      'hidden': hidden,
    }


  def _locate_node(self, key):
    if key is None:
      return self._schema

    # Compute the full path to the key
    path = list(self.trace_ancestors( self.clean_key(key), include_self=True ))[::-1]

    # Walk back down the tree using the full path
    temp = self._schema
    for step in path:
      temp = temp['children'][step]
    return temp


  def is_parent(self, p, c, loose=False):

    # Make sure child is a legitimate item
    if not c in self._backrefs:
      return None

    # Check the alt parents map directly, if applicable
    if loose and p in self._alt_parents[c]: return True

    # Check the list of ancestors
    for ancestor in self.trace_ancestors(c, include_self=True):
      if ancestor == p: return True

    # If all previous checks failed, p is not an ancestor of c
    return False
