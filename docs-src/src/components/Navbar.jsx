import { Button, Switch } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const Navbar = ({ lang, setLang }) => {
  const t = AppData[lang].nav;

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        padding: "0 40px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img src="./newton-n-star.svg" alt="Logo" style={{ width: "32px" }} />
        <span style={{ fontWeight: "bold", fontSize: "18px" }}>
          Zotero AI Newton
        </span>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("hero");
          }}
          style={{ color: "#333", textDecoration: "none" }}
        >
          {t.home}
        </a>
        <a
          href="#features"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("features");
          }}
          style={{ color: "#333", textDecoration: "none" }}
        >
          {t.features}
        </a>
        <a
          href="#howItWorks"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("howItWorks");
          }}
          style={{ color: "#333", textDecoration: "none" }}
        >
          {t.howItWorks}
        </a>
        <a
          href="#testimonials"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("testimonials");
          }}
          style={{ color: "#333", textDecoration: "none" }}
        >
          {t.testimonials}
        </a>
        <a
          href="#faq"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("faq");
          }}
          style={{ color: "#333", textDecoration: "none" }}
        >
          {t.faq}
        </a>

        <Switch
          checkedChildren="EN"
          unCheckedChildren="中"
          checked={lang === "en"}
          onChange={(checked) => setLang(checked ? "en" : "zh")}
        />

        <Button
          type="text"
          icon={<GithubOutlined />}
          href="https://github.com/newtontech/Zotero-AI-Newton"
          target="_blank"
        />
      </div>
    </motion.nav>
  );
};

export default Navbar;
