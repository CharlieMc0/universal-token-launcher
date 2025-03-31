import React from 'react';
import styled from 'styled-components';
import Header from './Header';
import Footer from './Footer';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  padding: 0 24px;
`;

const ContentContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 0;
`;

const Layout = ({ children }) => {
  return (
    <PageContainer>
      <Header />
      <Main>
        <ContentContainer>
          {children}
        </ContentContainer>
      </Main>
      <Footer />
    </PageContainer>
  );
};

export default Layout; 