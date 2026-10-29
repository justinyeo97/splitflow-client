import { Children, cloneElement, isValidElement, useRef } from "react";
import VariableProximity from "./VariableProximity.jsx";

export default function ProximityHeading({
  as: Tag = "h2",
  children,
  ...props
}) {
  const containerRef = useRef(null);
  function animate(nodes) {
    return Children.map(nodes, (child) => {
      if (typeof child === "string" || typeof child === "number") {
        if (!String(child).trim()) return child;
        return (
          <VariableProximity
            label={String(child)}
            containerRef={containerRef}
            fromFontVariationSettings="'wght' 700, 'opsz' 14"
            toFontVariationSettings="'wght' 950, 'opsz' 40"
            radius={100}
            smoothing={0.2}
            falloff="gaussian"
            idleWave={false}
          />
        );
      }
      return isValidElement(child) && child.props.children
        ? cloneElement(child, undefined, animate(child.props.children))
        : child;
    });
  }
  return (
    <Tag ref={containerRef} {...props}>
      {animate(children)}
    </Tag>
  );
}
