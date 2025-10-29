import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { IconSlash } from '@tabler/icons-react';
import { Fragment } from 'react';
import { prisma } from '@/lib/prisma';

type BreadcrumbItem = {
  title: string;
  link: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function getTrainingBySlugOrCode(
  slug: string
): Promise<{ name: string; code: string } | null> {
  // Nejprve zkus najít školení podle přímého kódu
  const trainingByCode = await prisma.training.findUnique({
    where: { code: slug.toUpperCase() },
    select: { name: true, code: true }
  });

  if (trainingByCode) {
    return trainingByCode;
  }

  // Pokud nenajdeš podle kódu, načti všechna školení a porovnej slugy
  const allTrainings = await prisma.training.findMany({
    select: { name: true, code: true }
  });

  // Najdi školení, jehož slug odpovídá URL
  for (const training of allTrainings) {
    const trainingSlug = slugify(training.name);
    if (trainingSlug === slug || training.code.toLowerCase() === slug) {
      return training;
    }
  }

  return null;
}

interface ServerBreadcrumbsProps {
  pathname: string;
}

export async function ServerBreadcrumbs({ pathname }: ServerBreadcrumbsProps) {
  const items: BreadcrumbItem[] = [];

  // Always start with AeroLMS
  items.push({
    title: 'AeroLMS',
    link: '/'
  });

  // Parse the pathname
  const segments = pathname.split('/').filter(Boolean);

  // If we're on a training page (any non-empty path)
  if (segments.length > 0) {
    const slug = segments[0];
    const training = await getTrainingBySlugOrCode(slug);

    if (training) {
      items.push({
        title: training.name,
        link: `/${slug}`
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.title}>
            {index !== items.length - 1 && (
              <BreadcrumbItem className='hidden md:block'>
                <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < items.length - 1 && (
              <BreadcrumbSeparator className='hidden md:block'>
                <IconSlash />
              </BreadcrumbSeparator>
            )}
            {index === items.length - 1 && (
              <BreadcrumbPage>{item.title}</BreadcrumbPage>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
