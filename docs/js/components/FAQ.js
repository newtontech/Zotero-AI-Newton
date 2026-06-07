// FAQ Component
window.FAQ = ({ lang }) => {
  const { Collapse, Typography } = antd;
  const { Title } = Typography;
  const t = window.AppData[lang].faq;

  return (
    <section id="faq" style={{ padding: "80px 20px", background: "#fff" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: "40px" }}>
          FAQ
        </Title>
        <Collapse
          accordion
          ghost
          items={t.map((item, i) => ({
            key: i,
            label: (
              <span style={{ fontSize: "18px", fontWeight: 500 }}>
                {item.q}
              </span>
            ),
            children: (
              <p style={{ fontSize: "16px", color: "#4b5563" }}>{item.a}</p>
            ),
          }))}
        />
      </div>
    </section>
  );
};
