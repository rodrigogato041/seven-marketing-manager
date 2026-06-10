-- Create Budget Limits table to store configurable limits per category
CREATE TABLE IF NOT EXISTS `budgetLimits` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category` varchar(100) NOT NULL,
  `costType` enum('fixed', 'variable', 'personal') NOT NULL,
  `limitAmount` decimal(12, 2) NOT NULL,
  `description` text,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_category_type` (`category`, `costType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default budget limits based on common categories
INSERT INTO `budgetLimits` (`category`, `costType`, `limitAmount`, `description`) VALUES
-- Fixed Costs
('Aluguel', 'fixed', 5000.00, 'Limite para aluguel de escritório'),
('Internet', 'fixed', 300.00, 'Limite para internet e telefone'),
('Energia', 'fixed', 500.00, 'Limite para energia elétrica'),
('Água', 'fixed', 200.00, 'Limite para água e saneamento'),
('Software', 'fixed', 1000.00, 'Limite para softwares e ferramentas'),
('Assinatura', 'fixed', 500.00, 'Limite para assinaturas e serviços'),
('Empréstimo', 'fixed', 2000.00, 'Limite para pagamento de empréstimos'),
('Imóvel', 'fixed', 5000.00, 'Limite para despesas com imóvel'),
('Marketing', 'fixed', 2000.00, 'Limite para marketing e publicidade'),

-- Variable Costs
('Tráfego', 'variable', 2000.00, 'Limite para tráfego pago'),
('Combustível', 'variable', 500.00, 'Limite para combustível'),
('Alimentação', 'variable', 800.00, 'Limite para alimentação'),
('Materiais', 'variable', 1000.00, 'Limite para materiais de produção'),
('Terceirização', 'variable', 2000.00, 'Limite para serviços terceirizados'),
('Comissão', 'variable', 1000.00, 'Limite para comissões'),

-- Personal Expenses
('Cartão', 'personal', 2000.00, 'Limite para despesas do cartão'),
('Celular', 'personal', 200.00, 'Limite para celular'),
('Moradia', 'personal', 3000.00, 'Limite para moradia pessoal'),
('Mercado', 'personal', 1000.00, 'Limite para compras de mercado'),
('Dízimo', 'personal', 500.00, 'Limite para dízimo e oferta'),
('Lazer', 'personal', 500.00, 'Limite para lazer e entretenimento');
