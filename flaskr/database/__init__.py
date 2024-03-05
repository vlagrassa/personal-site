from .db import (
  db,
  ExternalProfile,
  Project, ProjectRole, ProjectTag, ProjectTagMap, ProjectLocation,
  Post, PostGroup, PostTag, PostTagMap,
  TimelineSection, TimelineEntry,
)

# Map table names to table objects
# Injected into Flask context, so all table schemas are available in templates if needed
TABLES = {
  t.__name__: t for t in {
    ExternalProfile,

    Project,
    ProjectTag,
    ProjectTagMap,

    Post,
    PostGroup,
    PostTag,
    PostTagMap,

    TimelineSection,
    TimelineEntry,
  }
}

DB_ENUMS = {
  t.__name__: t for t in {
    ProjectRole,
    ProjectLocation,
  }
}
