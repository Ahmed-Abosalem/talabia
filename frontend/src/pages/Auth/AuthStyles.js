import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const logoEntrance = keyframes`
  0% { transform: translateY(15px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

export const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  display: flex;
  background: #ffffff;
  direction: rtl;
  overflow-x: hidden;
  position: relative;
`;

export const FormSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: #ffffff;
  min-height: 100vh;
  width: 100%;

  @media (max-width: 1024px) {
    padding: 2rem 1.5rem;
  }
`;

export const FormContainer = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  animation: ${fadeIn} 0.8s cubic-bezier(0.22, 1, 0.36, 1);
`;

export const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

export const BrandLogo = styled.img`
  height: 48px;
  width: auto;
  display: block;
  margin: 0 auto 1.25rem;
  object-fit: contain;
  animation: ${logoEntrance} 1s cubic-bezier(0.22, 1, 0.36, 1);
`;

export const Title = styled.h2`
  font-size: 2.25rem;
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.75rem;
  line-height: 1.2;

  @media (max-width: 640px) {
    font-size: 1.75rem;
  }
`;

export const Subtitle = styled.p`
  color: #6b7280;
  font-size: 1.1rem;
  line-height: 1.5;

  @media (max-width: 640px) {
    font-size: 1rem;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const LegalNotice = styled.div`
  margin-top: 1.5rem;
  font-size: 0.825rem;
  color: #6b7280;
  text-align: center;
  line-height: 1.5;

  a {
    color: #4b502a;
    text-decoration: none;
    font-weight: 700;
    transition: color 0.3s ease;

    &:hover {
      color: #ff7f00;
      text-decoration: underline;
    }
  }
`;

export const CheckboxWrapper = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  text-align: right;
  margin-bottom: 1.5rem;
  user-select: none;

  input {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #d1d5db;
    accent-color: #4b502a;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
`;

export const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: #ffffff;
  border: 2px solid #f3f4f6;
  border-radius: 12px;
  color: #4b5563;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 700;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  width: auto;
  min-width: 200px;
  margin-bottom: 2rem;

  &:hover {
    color: #4b502a;
    border-color: #4b502a40;
    background: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  svg {
    transition: transform 0.3s ease;
    color: #4b502a;
  }

  &:hover svg {
    transform: translateX(4px);
  }
`;

const motivationFade = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export const MotivationalMessage = styled.div`
  background: #f8fafc;
  border-right: 4px solid ${({ color }) => color || "#4b502a"};
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  animation: ${motivationFade} 0.5s ease-out backwards;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
    color: #111827;
  }
  
  p {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #4b5563;
  }
`;
