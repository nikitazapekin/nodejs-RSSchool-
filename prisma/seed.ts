import { ArticleStatus, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.article.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tag.deleteMany(),
  ]);

  const [admin, editor] = await Promise.all([
    prisma.user.create({
      data: {
        login: 'admin01',
        password: 'adminpass123',
        role: UserRole.admin,
      },
    }),
    prisma.user.create({
      data: {
        login: 'editor01',
        password: 'editorpass123',
        role: UserRole.editor,
      },
    }),
  ]);

  const [backend, devops, frontend] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Backend',
        description: 'Server-side engineering and APIs',
      },
    }),
    prisma.category.create({
      data: {
        name: 'DevOps',
        description: 'Delivery, infrastructure, and automation',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Frontend',
        description: 'UI engineering and browser applications',
      },
    }),
  ]);

  await prisma.tag.createMany({
    data: [
      { name: 'nestjs' },
      { name: 'typescript' },
      { name: 'postgresql' },
      { name: 'docker' },
      { name: 'prisma' },
    ],
  });

  const articles = await Promise.all([
    prisma.article.create({
      data: {
        title: 'Nest Fundamentals',
        content: 'A practical introduction to Nest.js modules and providers.',
        status: ArticleStatus.published,
        author: { connect: { id: admin.id } },
        category: { connect: { id: backend.id } },
        tags: {
          connectOrCreate: ['nestjs', 'typescript'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Prisma With PostgreSQL',
        content: 'How to model a relational API with Prisma and Postgres.',
        status: ArticleStatus.published,
        author: { connect: { id: editor.id } },
        category: { connect: { id: backend.id } },
        tags: {
          connectOrCreate: ['prisma', 'postgresql'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Docker Compose Workflow',
        content: 'Running application and database containers together.',
        status: ArticleStatus.draft,
        author: { connect: { id: admin.id } },
        category: { connect: { id: devops.id } },
        tags: {
          connectOrCreate: ['docker', 'postgresql'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Shipping UI Changes',
        content: 'Frontend delivery checklist for production releases.',
        status: ArticleStatus.archived,
        author: { connect: { id: editor.id } },
        category: { connect: { id: frontend.id } },
        tags: {
          connectOrCreate: ['typescript', 'docker'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Database Migrations in CI',
        content: 'Patterns for applying migrations safely in automated pipelines.',
        status: ArticleStatus.draft,
        author: { connect: { id: admin.id } },
        category: { connect: { id: devops.id } },
        tags: {
          connectOrCreate: ['prisma', 'docker', 'postgresql'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    }),
  ]);

  await prisma.comment.createMany({
    data: [
      {
        content: 'This helped me structure modules better.',
        articleId: articles[0].id,
        authorId: editor.id,
      },
      {
        content: 'The migration flow is clear and practical.',
        articleId: articles[1].id,
        authorId: admin.id,
      },
      {
        content: 'Good checklist for container startup order.',
        articleId: articles[2].id,
        authorId: editor.id,
      },
    ],
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
