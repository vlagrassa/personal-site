import os

from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)

from ..database import Post, PostGroup, PostTag, PostTagMap

blog_bp = Blueprint('blog', __name__, url_prefix='/blog')



def get_sections(filename, lang='en'):
  '''
    Parse an external markdown file into a list of sections
  '''

  # Initialize an empty section object
  section = {
    'title': None,
    'level': 0,
    'code':  'preamble',
    'body':  '',
  }

  # Loop through each line in the file
  with current_app.open_resource(f'static/data-standin/blog-posts/{filename}/main-{lang}.md') as mkd:
    for line in mkd.readlines():
      line = line.decode('utf-8')

      # If line is a header, finish the previous section and start a new one
      if line.startswith('#'):
        if section: yield section

        # Get section level based on number of hash marks
        if line.startswith('##'):
          level = 1
          line = line[2:].strip()
        else:
          level = 0
          line = line[1:].strip()

        section = {
          'title': {'en': line, 'ja': line, 'tj': line},
          'level': level,
          'code':  line.lower().replace(' ', '-'),
          'body':  '',
        }

      # Otherwise, add this line onto the body of the current section
      else:
        if section: section['body'] += line

    # Finish the final section
    # Check is to make sure at least one section was read
    if section['title'] or section['body']:
      yield section



@blog_bp.route('')
def blog():
  posts = Post.query.order_by(Post.date.desc()).all()

  # If URL var 'tags' is defined, map to list of PostTag objects for initial filter
  initial_tags = [ PostTag.query.get(t) for t in request.args.get('tags', '').split(',') ]
  initial_tags = [ t for t in initial_tags if t is not None ]

  return render_template('blog.html', **{
    'title': current_app.config['PAGES']['blog']['title'],
    'posts': posts,
    'groups': PostGroup.query.all(),
    'tags': PostTag.query.all(),
    'initial_tags': initial_tags,
  })


@blog_bp.route('/<string:slug>')
def group(slug):
  category = PostGroup.query.filter_by(slug=slug).first_or_404()
  return render_template('blog-category.html', **{
    'title': category.name,
    'breadcrumb': [
      ( current_app.config['PAGES']['blog']['title'], url_for('blog.blog') ),
    ],
    'posts': category.posts,
  })


@blog_bp.route('/post/<string:name>')
def post(name):
  post = Post.query.get_or_404(name)
  src_file_temp = name if os.path.exists(os.path.join(current_app.static_folder, f'../static/data-standin/blog-posts/{name}/main-en.md')) else 'hello-world'
  return render_template('blog-post.html', **{
    'title': post.name,
    'subtitle': post.description,
    'breadcrumb': [
      ( current_app.config['PAGES']['blog']['title'], url_for('blog.blog') ),
      ( post.category.name,                           url_for('blog.group', slug=post.category.slug) ),
    ],

    'sections': list(get_sections(src_file_temp)),
    'post': post,

    'header_image': post.image,
    'header_image_height': '45%',
  })
