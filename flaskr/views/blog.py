from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *
from ..database import Post, PostGroup, PostTagMap

blog_bp = Blueprint('blog', __name__, url_prefix='/blog')



def parse_post_object(post):
  return {
    'id':    post.id,
    'title': post.title,
    'desc':  post.description or '',
    'group': post.category.name,
    'date':  post.date,
    'tags':  PostTagMap.query_by_post(post, name_only=True),
  }


@blog_bp.route('')
def blog():
  posts = Post.query.order_by(Post.date.desc()).all()
  return render_template('blog.html', **{
    'title': PAGE_TITLES[2]['title'],
    'lang': 'en',
    'posts': [ parse_post_object(post) for post in posts ],
  })

@blog_bp.route('/<string:slug>')
def group(slug):
  category = PostGroup.query.filter_by(slug=slug).first_or_404()
  return render_template('placeholder.html', **{
    'title': {
      'en': category.name,
      'ja': category.name,
      'tj': category.name,
    },
    'lang': 'en',
  })

@blog_bp.route('/post/<string:name>')
def post(name):
  post = Post.query.get_or_404(name)
  return render_template('placeholder.html', **{
    'title': {
      'en': post.title,
      'ja': post.title,
      'tj': post.title,
    },
    'lang': 'en',
  })
