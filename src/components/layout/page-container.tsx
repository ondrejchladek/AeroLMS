import React from 'react';

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
        <div className='h-[calc(100dvh-52px)] w-full overflow-x-hidden overflow-y-auto'>
          <div className='w-full px-4 pt-2 pb-10 md:px-6 md:pt-1'>
            {children}
          </div>
        </div>
      ) : (
        <div className='h-full w-full px-4 pt-2 pb-10 md:px-6 md:pt-1'>
          {children}
        </div>
      )}
    </>
  );
}
