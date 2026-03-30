import React from "react";
import styled, { keyframes, css } from "styled-components";
import { Loader2 } from "lucide-react";

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

const StyledButton = styled.button`
  width: 100%;
  padding: 1rem 2rem;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  ${({ $variant, $activeColor }) =>
    $variant === "primary"
      ? css`
          background: ${$activeColor || "#4b502a"};
          color: #ffffff;
          box-shadow: none;
          
          &:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: none;
          }

          &:active:not(:disabled) {
            transform: translateY(-1px);
          }
        `
      : css`
          background: transparent;
          color: ${$activeColor || "#4b502a"};
          border: 2px solid ${$activeColor || "#4b502a"};
          
          &:hover:not(:disabled) {
            background: ${$activeColor ? `${$activeColor}10` : "rgba(75, 80, 42, 0.1)"};
            transform: translateY(-2px);
          }
        `}

  ${({ $isPulsing, $activeColor }) => $isPulsing && css`
    animation: ${pulse} 2s infinite ease-in-out;
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
  }

  &:focus:not(:active)::after {
    animation: ripple 0.6s ease-out;
  }

  @keyframes ripple {
    0% { transform: scale(0, 0); opacity: 0.5; }
    100% { transform: scale(100, 100); opacity: 0; }
  }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
`;

const ActionButton = ({
  children,
  onClick,
  variant = "primary",
  isLoading = false,
  disabled = false,
  activeColor,
  icon: Icon,
  isPulsing = false,
  ...props
}) => {
  return (
    <StyledButton
      onClick={onClick}
      $variant={variant}
      $activeColor={activeColor}
      disabled={disabled || isLoading}
      $isPulsing={isPulsing}
      $shadowColor={activeColor ? `${activeColor}66` : null}
      {...props}
    >
      {isLoading ? (
        <Spinner size={20} />
      ) : (
        <>
          {children}
          {Icon && <Icon size={20} />}
        </>
      )}
    </StyledButton>
  );
};

export default ActionButton;
