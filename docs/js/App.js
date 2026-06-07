// App Component
const App = () => {
  const { useState } = React;
  const { ConfigProvider, Layout, FloatButton } = antd;
  const { Navbar, Hero, Features, HowItWorks, Testimonials, FAQ, AppFooter } =
    window; // Access global components

  const [lang, setLang] = useState("en");

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
          borderRadius: 12,
        },
      }}
    >
      <Layout style={{ background: "transparent" }}>
        <Navbar lang={lang} setLang={setLang} />
        <Layout.Content>
          <Hero lang={lang} />
          <Features lang={lang} />
          <HowItWorks lang={lang} />
          <Testimonials lang={lang} />
          <FAQ lang={lang} />
        </Layout.Content>
        <AppFooter />
        <FloatButton.BackTop />
      </Layout>
    </ConfigProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
