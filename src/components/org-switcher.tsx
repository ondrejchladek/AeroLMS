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
  defaultTenant,
  onTenantSwitch
}: {
  tenants: Tenant[];
  defaultTenant: Tenant;
  onTenantSwitch?: (tenantId: string) => void;
}) {
  const [selectedTenant, setSelectedTenant] = React.useState<
    Tenant | undefined
  >(defaultTenant || (tenants.length > 0 ? tenants[0] : undefined));


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
              src="/favicon-32x32.png"
              alt="AeroLMS Logo"
              width={32}
              height={32}
              className='rounded-lg'
            />
          </div>
          <div className='flex flex-col mt-1 leading-none'>
            <span className='font-semibold'>AeroLMS</span>
            <span className='text-xs text-muted-foreground'>{selectedTenant.name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
