import { GetStaticProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';
import ApiSearchResponse from '@prismicio/client/types/ApiSearchResponse';
import Prismic from '@prismicio/client';
import { getPrismicClient } from '../services/prismic';

import styles from './home.module.scss';
import commonStyles from '../styles/common.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string | null>(
    postsPagination.next_page
  );

  async function handleLoadMorePosts(): Promise<void> {
    const loadMorePostsResponse: ApiSearchResponse = await (
      await fetch(nextPage)
    ).json();

    setPosts(oldPosts => [...oldPosts, ...loadMorePostsResponse.results]);
    setNextPage(loadMorePostsResponse.next_page);
  }

  return (
    <div className={`${commonStyles.contentContainer} ${styles.container}`}>
      <header>
        <img src="/logo.svg" alt="logo" />
      </header>

      <main>
        {posts.map(post => {
          return (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.post}>
                <article>
                  <h2>{post.data.title}</h2>
                  <p>{post.data.subtitle}</p>

                  <section>
                    <div>
                      <FiCalendar />
                      <span style={{ textTransform: 'capitalize' }}>
                        {format(
                          new Date(post.first_publication_date),
                          'dd MMM yyyy',
                          {
                            locale: ptBR,
                          }
                        )}
                      </span>
                    </div>

                    <div>
                      <FiUser />
                      <span>{post.data.author}</span>
                    </div>
                  </section>
                </article>
              </a>
            </Link>
          );
        })}

        {nextPage && (
          <button type="button" onClick={handleLoadMorePosts}>
            Carregar mais posts
          </button>
        )}
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'spacetravelingposts')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      orderings: '[document.first_publication_date]',
      pageSize: 2,
    }
  );

  return {
    props: {
      postsPagination: postsResponse,
    },
    revalidate: 60 * 30, // 30 min in sec
  };
};
