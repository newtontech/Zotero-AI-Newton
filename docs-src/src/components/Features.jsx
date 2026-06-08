import { Row, Col, Typography } from "antd";
import {
  CommentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Paragraph } = Typography;

const iconMap = {
  MessageSquare: CommentOutlined,
  FileText: FileTextOutlined,
  FolderOpen: FolderOpenOutlined,
  Cpu: ThunderboltOutlined,
  Zap: RocketOutlined,
  Shield: SafetyOutlined,
};

const Features = ({ lang }) => {
  const t = AppData[lang].features;

  return (
    <section id="features" style={{ padding: "80px 20px", background: "#fff" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: "60px" }}>
          Features
        </Title>
        <Row gutter={[32, 32]}>
          {t.map((feature, i) => {
            const IconComponent = iconMap[feature.icon];
            return (
              <Col xs={24} sm={12} md={8} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{
                    padding: "32px",
                    borderRadius: "16px",
                    background: "#f9fafb",
                    textAlign: "center",
                    height: "100%",
                  }}
                >
                  {IconComponent && (
                    <IconComponent
                      style={{
                        fontSize: "48px",
                        color: "#1677ff",
                        marginBottom: "16px",
                      }}
                    />
                  )}
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph type="secondary">{feature.desc}</Paragraph>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      </div>
    </section>
  );
};

export default Features;
