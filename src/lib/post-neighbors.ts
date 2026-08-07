type GroupedPost = {
    slug: string;
    series?: string;
    topic?: string;
};

export function findPostNeighbors<Post extends GroupedPost>(
    posts: ReadonlyArray<Post>,
    post: Post,
) {
    const relatedPosts = post.series
        ? posts.filter((item) => item.series === post.series)
        : post.topic
          ? posts.filter((item) => item.topic === post.topic)
          : [];
    const index = relatedPosts.findIndex((item) => item.slug === post.slug);

    return {
        previous: index > 0 ? relatedPosts[index - 1] : undefined,
        next: index >= 0 ? relatedPosts[index + 1] : undefined,
    };
}
