import { Carousel, Typography } from "antd";
import { motion } from "framer-motion";

const { Title, Paragraph, Text } = Typography;

const Testimonials = ({ lang }) => {
  const t = AppData[lang].testimonials;

  return (
    <section
      id="testimonials"
      style={{ padding: "80px 20px", background: "#fff" }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            {lang === "en" ? "Loved by Researchers" : "深受研究者喜爱"}
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
          <Paragraph
            type="secondary"
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontSize: "12px",
            }}
          >
            {lang === "en"
              ? "Demo testimonials - real user stories coming soon"
              : "示例评价 - 真实用户故事即将推出"}
          </Paragraph>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
