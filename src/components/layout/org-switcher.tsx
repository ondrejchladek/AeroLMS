'use client';

import Image from 'next/image';
import * as React from 'react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

interface Tenant {
  id: string;
  name: string;
}

export function OrgSwitcher({
  tenants,
  defaultTenant
}: {
  tenants: Tenant[];
  defaultTenant: Tenant;
}) {
  const [selectedTenant] = React.useState<Tenant | undefined>(
    defaultTenant || (tenants.length > 0 ? tenants[0] : undefined)
  );

  if (!selectedTenant) {
    return null;
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
        >
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
            <Image
              src='/favicon-32x32.png'
              alt='AeroLMS Logo'
              width={32}
              height={32}
              className='rounded-lg'
            />
          </div>
          <div className='mt-1 flex flex-col leading-none'>
            <span className='font-semibold'>AeroLMS</span>
            <span className='text-muted-foreground text-xs'>
              {selectedTenant.name}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
