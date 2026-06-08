import { Collapse, Typography } from "antd";
import { motion } from "framer-motion";

const { Title, Paragraph } = Typography;

const FAQ = ({ lang }) => {
  const t = AppData[lang].faq;

  const items = t.map((item, i) => ({
    key: i,
    label: item.q,
    children: <Paragraph>{item.a}</Paragraph>,
  }));

  return (
    <section id="faq" style={{ padding: "80px 20px", background: "#f9fafb" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
            FAQ
          </Title>
          <Collapse items={items} style={{ background: "#fff" }} />
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
