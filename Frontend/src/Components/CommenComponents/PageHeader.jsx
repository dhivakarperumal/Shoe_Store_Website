import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import defaultBg from "../../../public/images/pageheader.png";
import PageContainer from "./PageContainer";

const PageHeader = ({
  title,
  background,
  backgroundSize = "cover",
  backgroundPosition = "center",
  backgroundRepeat = "no-repeat",
  contentAlignment = "center",
  heightClassName = "h-[180px] sm:h-[200px] md:h-[210px] lg:h-[220px]",
  actionLabel,
  actionTo = "/",
}) => {

  const bgImage = background || defaultBg;
  const isLeftAligned = contentAlignment === "left";

  return (
    <div
      className={`relative flex w-full items-center text-white ${heightClassName} ${isLeftAligned ? "justify-start" : "justify-center"}`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat,
        backgroundColor: "#28180e",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0"></div>

      {/* Content */}
      <PageContainer className={`relative ${isLeftAligned ? "text-left" : "text-center"}`}>

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3">
          {title}
        </h1>

        {/* Breadcrumb */}
        <div className={`flex items-center gap-2 text-xs sm:text-sm md:text-base ${isLeftAligned ? "justify-start" : "justify-center"}`}>

          <Link
            to="/"
            className=" hover:text-white/80 transition"
          >
            Home
          </Link>

          <span>/</span>

          <span className="text-gray-200">{title}</span>
        </div>
        {actionLabel && (
          <Link
            to={actionTo}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ff4b0b] px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#e84309]"
          >
            {actionLabel} <ArrowRight size={16} />
          </Link>
        )}
      </PageContainer>

    </div>
  );
};

export default PageHeader;