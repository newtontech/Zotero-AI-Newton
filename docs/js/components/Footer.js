// Footer Component
window.AppFooter = () => {
  const { Layout, Typography, Space } = antd;
  const { Footer } = Layout;
  const { Paragraph } = Typography;
  const { GithubOutlined, GlobalOutlined } = window.icons;

  return (
    <Footer
      style={{
        textAlign: "center",
        background: "#001529",
        color: "#fff",
        padding: "60px 20px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <img
          src="./newton-n-star.svg"
          alt="Logo"
          style={{ height: "50px", filter: "brightness(0) invert(1)" }}
        />
      </div>
      <Paragraph style={{ color: "rgba(255,255,255,0.65)" }}>
        Made with ❤️ for researchers worldwide.
      </Paragraph>
      <Space size="large">
        <a
          href="https://github.com/newtontech/Zotero-AI-Newton"
          style={{ color: "#fff" }}
        >
          <GithubOutlined />
        </a>
        <a href="#" style={{ color: "#fff" }}>
          <GlobalOutlined />
        </a>
      </Space>
    </Footer>
  );
};
