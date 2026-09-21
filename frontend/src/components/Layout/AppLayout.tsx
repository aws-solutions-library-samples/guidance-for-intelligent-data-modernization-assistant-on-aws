import React, { useState } from 'react';
import { t } from '../../utils/textUtils';
import {
  AppLayout as CloudscapeAppLayout,
  SideNavigation,
  Container,
  Header,
  ContentLayout,
} from '@cloudscape-design/components';
import { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeHref, setActiveHref] = useState(location.pathname);

  const navigationItems: SideNavigationProps.Item[] = [
    {
      type: 'link',
      text: 'PERSONAL IDMA BOT',
      href: '/bot'
    },
    {
      type: 'link',
      text: 'DATABASE MIGRATION ASSISTANT',
      href: '/database'
    },
    {
      type: 'link',
      text: 'DATA ANALYTICS ASSISTANT',
      href: '/analytics',
    },
    {
      type: 'link',
      text: 'MODERN ONE DATA STRATEGY',
      href: '/strategy'
    },
  ];

  const handleNavigate = (href: string) => {
    setActiveHref(href);
    navigate(href);
  };

  return (
    <CloudscapeAppLayout
      navigation={
        <SideNavigation
          header={{ text: 'Main Menu', href: '/' }}
          items={navigationItems}
          activeHref={activeHref}
          onFollow={e => {
            e.preventDefault();
            handleNavigate(e.detail.href);
          }}
        />
      }
      content={
        <ContentLayout
          header={
            <Header
              variant="h1"
            >
              {t('common.app.title')}
            </Header>
          }
        >
          <Container>
            {children}
          </Container>
        </ContentLayout>
      }
      toolsHide={true}
      navigationWidth={300}
    />
  );
};

export default AppLayout; 