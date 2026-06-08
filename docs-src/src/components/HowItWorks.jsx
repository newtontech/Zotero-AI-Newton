import { Row, Col, Typography } from "antd";
import { motion } from "framer-motion";

const { Title, Paragraph, Steps } = Typography;

const HowItWorks = ({ lang }) => {
  const t = AppData[lang].howItWorks;

  const steps = t.steps.map((step, i) => ({
    title: step.title,
    description: step.desc,
  }));

  return (
    <section
      id="howItWorks"
      style={{ padding: "80px 20px", background: "#f9fafb" }}
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
            {t.title}
          </Title>
          <Steps
            direction="horizontal"
            size="small"
            current={steps.length}
            items={steps.map((step, i) => ({
              title: step.title,
              description: step.description,
            }))}
            style={{ maxWidth: "800px", margin: "0 auto" }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
