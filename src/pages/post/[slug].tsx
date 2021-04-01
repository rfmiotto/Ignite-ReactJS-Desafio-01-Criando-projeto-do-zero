import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import PrismicDOM from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useRouter } from 'next/router';
import { Fragment, useEffect, useMemo } from 'react';
import ApiSearchResponse from '@prismicio/client/types/ApiSearchResponse';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';
import { PreviewButton } from '../../components/PreviewButton';
import { NeighborhoodPost, PostFooter } from '../../components/PostFooter';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost: NeighborhoodPost;
  previousPost: NeighborhoodPost;
}

export default function Post({
  post,
  preview,
  nextPost,
  previousPost,
}: PostProps): JSX.Element {
  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute(
      'repo',
      'rfmiotto/Ignite-ReactJS-Desafio-01-Criando-projeto-do-zero'
    );
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }, []);

  const router = useRouter();

  const estimatedReadTime = useMemo(() => {
    if (router.isFallback) {
      return 0;
    }

    const wordsPerMinute = 200;

    const contentWords = post.data.content.reduce(
      (summedContents, currentContent) => {
        const headingWords = currentContent.heading.split(/\s/g).length;
        const bodyWords = currentContent.body.reduce(
          (summedBodies, currentBody) => {
            const textWords = currentBody.text.split(/\s/g).length;

            return summedBodies + textWords;
          },
          0
        );

        return summedContents + headingWords + bodyWords;
      },
      0
    );

    const minutes = contentWords / wordsPerMinute;
    const readTime = Math.ceil(minutes);

    return readTime;
  }, [post, router.isFallback]);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Header />

      <section
        className={styles.banner}
        data-testid="banner"
        style={{ backgroundImage: `url(${post.data.banner.url})` }}
      />

      <main className={`${commonStyles.contentContainer} ${styles.container}`}>
        <section>
          <h1>{post.data.title}</h1>

          <section>
            <div>
              <FiCalendar />
              <span style={{ textTransform: 'capitalize' }}>
                {format(parseISO(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
            </div>

            <div>
              <FiUser />
              <span>{post.data.author}</span>
            </div>

            <div>
              <FiClock />
              <span>{estimatedReadTime} min</span>
            </div>
          </section>

          <i>
            {format(
              parseISO(post.last_publication_date),
              "'* editado em 'dd MMM yyyy', às 'hh:mm",
              {
                locale: ptBR,
              }
            )}
          </i>
        </section>

        <article>
          {post.data.content.map(({ heading, body }) => (
            <Fragment key={heading}>
              <h2>{heading}</h2>

              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: PrismicDOM.RichText.asHtml(body),
                }}
              />
            </Fragment>
          ))}

          <hr />

          <PostFooter nextPost={nextPost} previousPost={previousPost} />

          <div id="inject-comments-for-uterances" />

          <PreviewButton preview={preview} />
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'spacetravelingposts')],
    {
      fetch: ['post.title', 'post.banner', 'post.author', 'post.content'],
    }
  );

  const paths = postsResponse?.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

function formatNeighborhoodPost(
  post: ApiSearchResponse,
  slug: string | string[]
): NeighborhoodPost | null {
  console.log(slug);
  console.log(post.results[0].uid);
  return slug === post.results[0].uid
    ? null
    : {
        title: post.results[0]?.data?.title,
        uid: post.results[0]?.uid,
      };
}

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  // const response = await prismic.getByUID('post', String(slug), {});
  const response = await prismic.getByUID('spacetravelingposts', String(slug), {
    fetch: [
      'document.title',
      'document.banner',
      'document.author',
      'document.content',
    ],
  });

  const responsePreviousPost = await prismic.query(
    Prismic.predicates.at('document.type', 'spacetravelingposts'),
    {
      pageSize: 1,
      after: slug,
      orderings: '[document.first_publication_date]',
    }
  );

  const responseNextPost = await prismic.query(
    Prismic.predicates.at('document.type', 'spacetravelingposts'),
    {
      pageSize: 1,
      after: slug,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const nextPost = formatNeighborhoodPost(responseNextPost, slug);
  const previousPost = formatNeighborhoodPost(responsePreviousPost, slug);

  console.log(responseNextPost);
  console.log(responsePreviousPost);
  console.log(slug);

  return {
    props: {
      post: response,
      preview,
      nextPost,
      previousPost,
    },
    revalidate: 60 * 30, // 30 min
  };
};
