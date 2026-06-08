// Hero Component
window.Hero = ({ lang }) => {
  const { Row, Col, Typography, Button, Space, Tag, Card, Avatar } = antd;
  const { Title, Paragraph, Text } = Typography;
  const { DownloadOutlined, GithubOutlined } = window.icons;
  const { motion } = window.Motion;
  const t = window.AppData[lang].hero;

  return (
    <section
      style={{
        position: "relative",
        padding: "100px 20px",
        overflow: "hidden",
      }}
    >
      <div className="animated-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Row gutter={[48, 48]} align="middle">
          <Col xs={24} md={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Tag
                color="blue"
                style={{
                  marginBottom: "16px",
                  padding: "4px 12px",
                  borderRadius: "100px",
                }}
              >
                {t.badge}
              </Tag>
              <Title
                style={{
                  fontSize: "clamp(40px, 5vw, 64px)",
                  lineHeight: 1.1,
                  marginBottom: "24px",
                }}
              >
                {t.title} <br />
                <span style={{ color: "#1677ff" }}>{t.titleHighlight}</span>
              </Title>
              <Paragraph
                style={{
                  fontSize: "18px",
                  color: "#4b5563",
                  marginBottom: "32px",
                  maxWidth: "540px",
                }}
              >
                {t.subtitle}
              </Paragraph>
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  icon={<DownloadOutlined />}
                  href="https://newtontech.github.io/Zotero-AI-Newton/release/zotero-ai-newton-0.0.1-beta.xpi"
                  style={{
                    height: "50px",
                    padding: "0 32px",
                    fontSize: "16px",
                  }}
                >
                  {t.ctaPrimary}
                </Button>
                <Button
                  size="large"
                  shape="round"
                  icon={<GithubOutlined />}
                  href="https://github.com/newtontech/Zotero-AI-Newton"
                  style={{
                    height: "50px",
                    padding: "0 32px",
                    fontSize: "16px",
                  }}
                >
                  {t.ctaSecondary}
                </Button>
              </Space>

              <div style={{ marginTop: "40px", display: "flex", gap: "32px" }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t.stats.downloads}
                  </Title>
                  <Text type="secondary">Downloads</Text>
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t.stats.rating}
                  </Title>
                  <Text type="secondary">Rating</Text>
                </div>
              </div>
            </motion.div>
          </Col>
          <Col xs={24} md={12}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ position: "relative" }}
            >
              {/* Chat Demo Mockup */}
              <Card
                bordered={false}
                className="glass"
                style={{
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "16px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Avatar shape="square" src="./newton-n-star.svg" />
                  <div>
                    <Text strong style={{ display: "block" }}>
                      Zotero AI Newton
                    </Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Online • Local Mode
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    padding: "24px",
                    height: "300px",
                    overflowY: "auto",
                    background: "rgba(255,255,255,0.5)",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        background: "#e6f4ff",
                        padding: "12px 16px",
                        borderRadius: "16px 16px 16px 4px",
                        maxWidth: "85%",
                        marginLeft: "auto",
                        marginBottom: "4px",
                      }}
                    >
                      <Text>
                        Summarize the key findings of the selected paper
                        regarding neural plasticity.
                      </Text>
                    </div>
                    <Text
                      type="secondary"
                      style={{ fontSize: "10px", float: "right" }}
                    >
                      You • 10:42 AM
                    </Text>
                  </div>
                  <div style={{ clear: "both", marginBottom: "16px" }}>
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        padding: "12px 16px",
                        borderRadius: "16px 16px 4px 16px",
                        maxWidth: "90%",
                      }}
                    >
                      <Text>
                        Based on the paper{" "}
                        <i>"Mechanisms of Neural Plasticity"</i>, the key
                        findings are:
                        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
                          <li>
                            Synaptic strength is modulated by
                            spike-timing-dependent plasticity (STDP).
                          </li>
                          <li>
                            Long-term potentiation (LTP) requires NMDA receptor
                            activation.
                          </li>
                        </ul>
                        These results suggest a Hebbian learning rule.
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: "10px" }}>
                      Newton • 10:42 AM
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px",
                    borderTop: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      background: "#f3f4f6",
                      borderRadius: "100px",
                      height: "40px",
                      width: "100%",
                    }}
                  ></div>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </div>
    </section>
  );
};
