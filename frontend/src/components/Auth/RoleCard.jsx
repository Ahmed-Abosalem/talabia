import React from "react";
import styled, { css } from "styled-components";

const Card = styled.button`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0 0.75rem;
  background: #ffffff;
  border-radius: 10px;
  border: 2px solid ${({ $active, $color }) => ($active ? ($color || "#4b502a") : "transparent")};
  box-shadow: ${({ $active, $color }) =>
    $active
      ? `0 12px 24px -8px ${$color ? `${$color}25` : "rgba(0,0,0,0.1)"}`
      : "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"};
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 140px;
  height: 48px;
  outline: none;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.12);
    background: #fafafa;
    border-color: ${({ $color }) => ($color ? `${$color}33` : "#e5e7eb")};
  }

  ${({ $active }) =>
    $active &&
    css`
      background: #fdfdfd;
    `}
`;

const IconContainer = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, $active }) =>
    $active ? ($color || "#4b502a") : ($color ? `${$color}10` : "#f3f4f6")};
  color: ${({ $active }) => ($active ? "#ffffff" : "inherit")};
  transition: all 0.3s ease;

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
  }
`;

const Label = styled.div`
  font-size: 0.85rem;
  font-weight: 800;
  color: ${({ $active, $color }) => ($active ? ($color || "#4b502a") : "#1f2937")};
  transition: color 0.3s ease;
`;

const Badge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "#4b502a"};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transform: scale(${({ $active }) => ($active ? 1 : 0)});
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const RoleCard = ({ label, icon: Icon, color, active, onClick }) => {
  return (
    <Card $active={active} $color={color} onClick={onClick}>
      <Badge $active={active} $color={color} />
      <IconContainer $color={color} $active={active}>
        {Icon && <Icon />}
      </IconContainer>
      <Label $active={active} $color={color}>
        {label}
      </Label>
    </Card>
  );
};

export default RoleCard;
