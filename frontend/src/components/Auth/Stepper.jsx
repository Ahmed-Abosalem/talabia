import React from "react";
import styled, { css, keyframes } from "styled-components";
import { Check, ChevronLeft } from "lucide-react";

const scaleIn = keyframes`
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const StepperContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 1.5rem 0 3rem;
  position: relative;
  padding: 0 1rem;
`;

const StepWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  flex: 1;
`;

const Connector = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0.5;
  color: #e5e7eb;
  padding-bottom: 24px; /* Align with circles */
  transition: color 0.4s ease;

  ${({ $completed, $activeColor }) =>
    $completed &&
    css`
      color: ${$activeColor || "#ff7f00"};
    `}
`;

const StepCircle = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: #ffffff;
  border: 2px solid #e5e7eb;
  color: #9ca3af;
  position: relative;

  ${({ $active, $activeColor }) =>
    $active &&
    css`
      border-color: ${$activeColor || "#ff7f00"};
      color: ${$activeColor || "#ff7f00"};
      background: #ffffff;
      box-shadow: 0 0 0 6px ${$activeColor ? `${$activeColor}15` : "#ff7f0015"};
      transform: scale(1.1);
      z-index: 3;
    `}

  ${({ $completed, $activeColor }) =>
    $completed &&
    css`
      background: ${$activeColor || "#4b502a"};
      border-color: ${$activeColor || "#4b502a"};
      color: #ffffff;
      animation: ${scaleIn} 0.4s ease-out;
    `}
`;

const StepLabel = styled.span`
  margin-top: 0.85rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  color: ${({ $active, $completed }) => ($active || $completed ? "#111827" : "#9ca3af")};
  transition: color 0.4s ease;
  white-space: nowrap;
`;

const Stepper = ({ steps, currentStep, activeColor }) => {
  return (
    <StepperContainer>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <StepWrapper>
              <StepCircle $active={isActive} $completed={isCompleted} $activeColor={activeColor}>
                {isCompleted ? <Check size={20} strokeWidth={3} /> : stepNumber}
              </StepCircle>
              <StepLabel $active={isActive} $completed={isCompleted}>
                {label}
              </StepLabel>
            </StepWrapper>

            {!isLast && (
              <Connector $completed={isCompleted} $activeColor={activeColor}>
                <ChevronLeft size={24} strokeWidth={2.5} />
              </Connector>
            )}
          </React.Fragment>
        );
      })}
    </StepperContainer>
  );
};

export default Stepper;
