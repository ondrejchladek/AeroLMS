import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PageContainer({
  children,
  scrollable = true
}: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <>
      {scrollable ? (
        <ScrollArea className='h-[calc(100dvh-52px)]'>
          <div className='h-full w-full px-4 pt-2 pb-10 md:px-6 md:pt-1'>
            <div className='mx-auto w-full max-w-[1600px]'>{children}</div>
          </div>
        </ScrollArea>
      ) : (
        <div className='h-full w-full px-4 pt-2 pb-10 md:px-6 md:pt-1'>
          <div className='mx-auto w-full max-w-[1600px]'>{children}</div>
        </div>
      )}
    </>
  );
}
