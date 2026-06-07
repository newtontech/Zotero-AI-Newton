// HowItWorks Component
window.HowItWorks = ({ lang }) => {
  const { Steps, Card, Typography } = antd;
  const { Title, Text } = Typography;
  const {
    ReadOutlined,
    StarOutlined,
    RobotOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
  } = window.icons;
  const t = window.AppData[lang].howItWorks;

  return (
    <section
      id="how-it-works"
      style={{ padding: "80px 20px", background: "#f0f5ff" }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: "60px" }}>
          {t.title}
        </Title>

        {/* Visual Diagram */}
        <div
          style={{
            marginBottom: "80px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <Card
            style={{
              textAlign: "center",
              width: "200px",
              borderRadius: "16px",
            }}
          >
            <ReadOutlined
              style={{
                fontSize: "40px",
                color: "#f5222d",
                marginBottom: "10px",
              }}
            />
            <Title level={5}>Zotero</Title>
            <Text type="secondary">Your Library</Text>
          </Card>
          <ArrowRightOutlined
            style={{ fontSize: "30px", color: "#9ca3af" }}
            className="arrow-anim"
          />
          <Card
            style={{
              textAlign: "center",
              width: "220px",
              borderRadius: "16px",
              border: "2px solid #1677ff",
            }}
          >
            <StarOutlined
              style={{
                fontSize: "40px",
                color: "#1677ff",
                marginBottom: "10px",
              }}
            />
            <Title level={5}>Newton Extension</Title>
            <Text type="secondary">Local Processing</Text>
          </Card>
          <ArrowRightOutlined
            style={{ fontSize: "30px", color: "#9ca3af" }}
            className="arrow-anim"
          />
          <Card
            style={{
              textAlign: "center",
              width: "200px",
              borderRadius: "16px",
            }}
          >
            <RobotOutlined
              style={{
                fontSize: "40px",
                color: "#52c41a",
                marginBottom: "10px",
              }}
            />
            <Title level={5}>LLM</Title>
            <Text type="secondary">OpenAI / Local</Text>
          </Card>
        </div>

        <Steps
          current={-1}
          direction="vertical"
          items={t.steps.map((s) => ({
            title: (
              <span style={{ fontSize: "18px", fontWeight: 600 }}>
                {s.title}
              </span>
            ),
            description: (
              <span style={{ fontSize: "16px", color: "#4b5563" }}>
                {s.desc}
              </span>
            ),
            icon: <CheckCircleOutlined />,
          }))}
        />
      </div>
    </section>
  );
};
