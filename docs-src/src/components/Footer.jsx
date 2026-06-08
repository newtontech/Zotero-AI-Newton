import { Typography } from "antd";
import { GithubOutlined, HeartOutlined } from "@ant-design/icons";

const { Paragraph, Link } = Typography;

const AppFooter = () => {
  return (
    <footer
      style={{
        padding: "40px 20px",
        textAlign: "center",
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "16px" }}>
          <a
            href="https://github.com/newtontech/Zotero-AI-Newton"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "24px", color: "#333", margin: "0 8px" }}
          >
            <GithubOutlined />
          </a>
        </div>
        <Paragraph type="secondary" style={{ marginBottom: "8px" }}>
          Made with <HeartOutlined style={{ color: "#ff4d4f" }} /> for
          researchers worldwide
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: "12px" }}>
          © {new Date().getFullYear()} Zotero AI Newton. Licensed under
          AGPL-3.0-or-later.
        </Paragraph>
      </div>
    </footer>
  );
};

export default AppFooter;
