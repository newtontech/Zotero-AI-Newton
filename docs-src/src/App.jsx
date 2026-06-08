import { useState } from "react";
import { Layout, FloatButton } from "antd";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import AppFooter from "./components/Footer";
import AppData from "./data";

const App = () => {
  const [lang, setLang] = useState("en");

  return (
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
  );
};

export default App;
