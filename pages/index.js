const { EmptyState, Layout, Page } = require("@shopify/polaris");
import { TitleBar } from '@shopify/app-bridge-react';
import Link from 'next/link'


const Index = () => (
    <Page>
         <TitleBar
      title="Sample App"
      primaryAction={{
        content: 'Select products',
      }}
    />
      <Layout>
      <EmptyState
        heading="Discount your products temporarily"
        action={{
          content: 'Select products',
          onAction: () => console.log('clicked'),
        }}
      >
        <p>Select products to change their price temporarily.</p>
      </EmptyState>
      <Link href="/script-page"> 
        <a >Script Page</a>
      </Link>
      </Layout>
    </Page>
  );
  
  export default Index;