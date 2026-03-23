// Navbar Component
window.Navbar = ({ lang, setLang }) => {
  const { Header } = antd.Layout;
  const { Title } = antd.Typography;
  const { Space, Button } = antd;
  const { GlobalOutlined } = window.icons;
  const t = window.AppData[lang].nav;

  return (
    <Header
      className="glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "0 20px",
        height: "70px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img src="./newton-n-star.svg" alt="Logo" style={{ height: "40px" }} />
        <Title
          level={4}
          style={{
            margin: 0,
            background: "linear-gradient(90deg, #1677ff, #722ed1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Zotero AI Newton
        </Title>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          className="desktop-menu"
          style={{ marginRight: "20px", display: "flex", gap: "24px" }}
        >
          <a
            href="#features"
            style={{
              color: "#1f2937",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.features}
          </a>
          <a
            href="#how-it-works"
            style={{
              color: "#1f2937",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.howItWorks}
          </a>
          <a
            href="#testimonials"
            style={{
              color: "#1f2937",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.testimonials}
          </a>
          <a
            href="#faq"
            style={{
              color: "#1f2937",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.faq}
          </a>
        </div>
        <antd.Button
          shape="round"
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          icon={<GlobalOutlined />}
        >
          {lang === "en" ? "中文" : "English"}
        </antd.Button>
      </div>
    </Header>
  );
};
