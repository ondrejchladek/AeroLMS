// src/components/layout/app-sidebar.tsx
'use client';

import * as React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navItems as staticNavItems } from '@/constants/data';
import { useMediaQuery } from '@/hooks/use-media-query';
import { NavItem } from '@/types';

import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconMoon,
  IconPhotoUp,
  IconSun,
  IconUserCircle,
} from '@tabler/icons-react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Icons } from '../icons';
import { OrgSwitcher } from '../org-switcher';

import { useSession, signOut } from 'next-auth/react';

export const company = {
  name: 'Aerotech Czech s.r.o.',
  logo: IconPhotoUp,
  plan: 'Enterprise',
};

const tenants = [
  { id: '1', name: 'Aerotech Czech s.r.o.' }
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Next-Auth session
  const { data: session } = useSession();
  const user = session?.user ?? null;

  // State pro dynamické menu items
  const [navItems, setNavItems] = React.useState<NavItem[]>(staticNavItems);
  const [adminNavItems, setAdminNavItems] = React.useState<NavItem[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = React.useState(true);
  
  // Check if user is admin
  const isAdmin = user?.email === 'test@test.cz';

  const handleSwitchTenant = (_tenantId: string) => {
    /* implementace tenant switchingu */
  };

  const activeTenant = tenants[0];

  // Načti školení z API
  React.useEffect(() => {
    const fetchTrainings = async () => {
      if (!session) return;

      try {
        const response = await fetch('/api/trainings');
        if (response.ok) {
          const data = await response.json();

          // Kombinuj statické položky s dynamickými školeními
          const dynamicNavItems: NavItem[] = [
            staticNavItems[0], // Přehled
            ...data.trainings.map((training: any) => ({
              title: training.name,
              url: training.url,
              icon: training.icon,
              isActive: false,
              items: []
            }))
          ];
          
          // Vytvoř admin menu items pouze pro admina
          if (user?.email === 'test@test.cz') {
            const adminItems: NavItem[] = [
              {
                title: 'Admin přehled',
                url: '/admin/prehled',
                icon: 'settings',
                isActive: false,
                items: []
              },
              {
                title: 'Nové školení',
                url: '/admin/nove-skoleni',
                icon: 'add',
                isActive: false,
                items: []
              }
            ];
            setAdminNavItems(adminItems);
          }

          setNavItems(dynamicNavItems);
        }
      } catch (error) {
        console.error('Failed to fetch trainings:', error);
      } finally {
        setIsLoadingTrainings(false);
      }
    };

    fetchTrainings();
  }, [session]);

  React.useEffect(() => {
    /* případné side-effects na otevření/ zavření sidebaru */
  }, [isOpen]);

  return (
    <Sidebar collapsible='icon'>
      {/* ---------- HLAVIČKA ---------- */}
      <SidebarHeader>
        <OrgSwitcher
          tenants={tenants}
          defaultTenant={activeTenant}
          onTenantSwitch={handleSwitchTenant}
        />
      </SidebarHeader>

      {/* ---------- OBSAH ---------- */}
      <SidebarContent className='overflow-x-hidden'>
        {/* Admin Menu - zobrazí se jen pro admina */}
        {adminNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Menu</SidebarGroupLabel>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
        
        {/* Běžné Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;

              return item.items?.length ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={pathname === item.url}
                      >
                        {item.icon && <Icon />}
                        <span>{item.title}</span>
                        <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === sub.url}
                            >
                              <Link href={sub.url}>{sub.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ---------- FOOTER ---------- */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  {user && (
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      /* adaptace pro Next-Auth: předáme jméno a případně image */
                      user={{
                        fullName: user.name ?? 'User',
                        imageUrl: (user as any).image ?? undefined,
                      }}
                    />
                  )}
                  <IconChevronsDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    {user && (
                      <UserAvatarProfile
                        className='h-8 w-8 rounded-lg'
                        showInfo
                        user={{
                          fullName: user.name ?? 'User',
                          imageUrl: (user as any).image ?? undefined,
                        }}
                      />
                    )}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/profil')}>
                    <IconUserCircle className='mr-2 h-4 w-4' />
                    Profil uživatele
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? (
                      <IconSun className='mr-2 h-4 w-4' />
                    ) : (
                      <IconMoon className='mr-2 h-4 w-4' />
                    )}
                    {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                  <IconLogout className='mr-2 h-4 w-4' />
                  Odhlásit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
