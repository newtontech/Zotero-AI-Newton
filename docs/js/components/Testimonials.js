// Testimonials Component
window.Testimonials = ({ lang }) => {
  const { Carousel, Typography } = antd;
  const { Title, Paragraph, Text } = Typography;
  const t = window.AppData[lang].testimonials;

  return (
    <section
      id="testimonials"
      style={{ padding: "80px 20px", background: "#fff" }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: "60px" }}>
          Loved by Researchers
        </Title>
        <Carousel autoplay dots={{ className: "custom-dots" }} effect="fade">
          {t.map((item, i) => (
            <div key={i}>
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  background: "#f9fafb",
                  borderRadius: "24px",
                  margin: "0 10px",
                }}
              >
                <Paragraph
                  style={{
                    fontSize: "24px",
                    fontStyle: "italic",
                    color: "#374151",
                    marginBottom: "30px",
                  }}
                >
                  "{item.text}"
                </Paragraph>
                <Title level={5} style={{ margin: 0 }}>
                  {item.name}
                </Title>
                <Text type="secondary">{item.role}</Text>
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
};
