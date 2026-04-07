import React, { useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { AlertCircle } from "lucide-react";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

const Gutter = styled.div`
  margin-bottom: 1.5rem;
  position: relative;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc; /* --adm-bg */
  border-radius: 8px; /* --rad-md */
  border: 1.5px solid ${({ $error }) => ($error ? "#f97373" : "#e2e8f0")};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  ${({ $isFocused, $activeColor }) =>
    $isFocused &&
    css`
      background: #ffffff;
      border-color: ${$activeColor || "#4b502a"};
      box-shadow: 0 0 0 4px ${$activeColor ? `${$activeColor}15` : "#4b502a15"};
      transform: translateY(-1px);
    `}

  ${({ $error }) =>
    $error &&
    css`
      animation: ${shake} 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    `}
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 1.25rem 3.25rem 0.65rem 3rem;
  font-size: 0.95rem;
  border: none;
  background: transparent;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  font-weight: 600;

  &::placeholder {
    color: transparent;
  }
`;

const Label = styled.label`
  position: absolute;
  right: 3.25rem;
  top: ${({ $isFloating }) => ($isFloating ? "0.45rem" : "50%")};
  transform: ${({ $isFloating }) => ($isFloating ? "none" : "translateY(-50%)")};
  font-size: ${({ $isFloating }) => ($isFloating ? "0.7rem" : "0.9rem")};
  color: ${({ $isFloating, $isFocused, $activeColor }) =>
    $isFocused ? ($activeColor || "#4b502a") : ($isFloating ? "#64748b" : "#94a3b8")};
  font-weight: ${({ $isFloating }) => ($isFloating ? "800" : "600")};
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
`;

const IconWrapper = styled.div`
  position: absolute;
  right: 1.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $isFocused, $activeColor }) =>
    $isFocused ? ($activeColor || "#4b502a") : "#94a3b8"};
  transition: color 0.3s ease;
`;

const EndActionWrapper = styled.div`
  position: absolute;
  left: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9ca3af;
  &:hover {
    color: #4b502a;
  }
`;

const ErrorMsg = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #f97373;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-weight: 600;
`;

const PremiumInput = ({
  label,
  icon: Icon,
  endAction,
  error,
  value,
  onChange,
  activeColor,
  type = "text",
  id,
  name,
  autoComplete,
  inputMode,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || (value && value.length > 0);

  // Generate a stable ID for label-input linking (critical for autofill)
  const inputId = id || name || undefined;

  return (
    <Gutter>
      <InputContainer $isFocused={isFocused} $error={error} $activeColor={activeColor}>
        {Icon && (
          <IconWrapper $isFocused={isFocused} $activeColor={activeColor}>
            <Icon size={20} />
          </IconWrapper>
        )}

        <Label
          htmlFor={inputId}
          $isFloating={isFloating}
          $isFocused={isFocused}
          $activeColor={activeColor}
        >
          {label}
        </Label>

        {type === "textarea" ? (
          <StyledInput
            as="textarea"
            id={inputId}
            name={name}
            autoComplete={autoComplete}
            rows={props.rows || 4}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={onChange}
            style={{ resize: "none", paddingTop: "1.5rem" }}
            {...props}
          />
        ) : (
          <StyledInput
            type={type}
            id={inputId}
            name={name}
            autoComplete={autoComplete}
            inputMode={inputMode}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={onChange}
            {...props}
          />
        )}

        {endAction && <EndActionWrapper>{endAction}</EndActionWrapper>}
      </InputContainer>

      {error && (
        <ErrorMsg>
          <AlertCircle size={12} />
          {error}
        </ErrorMsg>
      )}
    </Gutter>
  );
};

export default PremiumInput;
