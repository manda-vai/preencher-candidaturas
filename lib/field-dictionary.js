/**
 * field-dictionary.js
 * 
 * Dicionário bilíngue (pt-BR / en) para identificação de campos
 * em formulários de candidatura. Mapeia sinais extraídos dos elementos
 * HTML para os campos do perfil do candidato.
 * 
 * Cada entrada contém:
 *   key        → chave interna do campo (usada no storage)
 *   label      → nome amigável para exibição
 *   type       → tipo esperado ('text'|'email'|'tel'|'number'|'select'|'textarea'|'file'|'date'|'checkbox')
 *   patterns   → array de strings/regex para match em name, id, placeholder, label, aria-label
 *   priority   → peso do campo na detecção (maior = mais importante acertar)
 */

const FIELD_DICTIONARY = [
  // ─── DADOS PESSOAIS ─────────────────────────────────────────────
  {
    key: 'nome',
    label: 'Nome (primeiro nome)',
    type: 'text',
    priority: 9,
    patterns: [
      'primeiro nome', 'first name', 'given name', 'firstname',
      'primeiro_nome', 'first_name', 'pnome', 'nome_do_meio',
      'seu primeiro nome', 'your first name'
    ]
  },
  {
    key: 'sobrenome',
    label: 'Sobrenome / Último nome',
    type: 'text',
    priority: 9,
    patterns: [
      'sobrenome', 'last name', 'surname', 'family name',
      'ultimo nome', 'último nome', 'segundo nome',
      'last_name', 'sobrenome_candidato', 'second name',
      'family_name', 'surname_candidato'
    ]
  },
  {
    key: 'nomeCompleto',
    label: 'Nome completo',
    type: 'text',
    priority: 10,
    patterns: [
      'nome completo', 'full name', 'nome', 'name', 'seu nome',
      'candidate name', 'candidate_name', 'nome_candidato',
      'nomecompleto', 'fullname', 'your name',
      'nome do candidato', 'nm_candidato', 'nm_completo',
      'nome inteiro', 'full_name'
    ]
  },
  {
    key: 'email',
    label: 'E-mail',
    type: 'email',
    priority: 10,
    patterns: [
      'email', 'e-mail', 'e mail', 'correo', 'correo eletronico',
      'email address', 'endereco de email', 'mail',
      'candidate_email', 'email_candidato'
    ]
  },
  {
    key: 'telefone',
    label: 'Telefone / WhatsApp',
    type: 'tel',
    priority: 9,
    patterns: [
      'telefone', 'telefone celular', 'celular', 'phone', 'phone number',
      'whatsapp', 'contato', 'contact', 'mobile', 'cellphone',
      'telefone para contato', 'celular para contato',
      'tel', 'fone', 'nr_telefone', 'nr_celular',
      'phones', 'phone1', 'phone2', 'mainContactPhone',
      'main_contact_phone', 'phone_number', 'telephone',
      'nr_phone', 'contact_phone', 'contact phone',
      'celular_whatsapp', 'telefone_celular', 'phone contact',
      'telefone_contato', 'tel_celular', 'fone_celular',
      'mobile phone', 'mobile_phone', 'phone_1', 'phone_2',
      'telefone_1', 'telefone_2', 'telefone_principal',
      'whatsapp_contato'
    ]
  },
  {
    key: 'cpf',
    label: 'CPF',
    type: 'text',
    priority: 8,
    patterns: [
      'cpf', 'documento', 'document', 'cpf/cnpj', 'cpf_cnpj',
      'n° do cpf', 'numero do cpf', 'nr_documento', 'documento_identificador',
      'cadastro de pessoa fisica', 'registro geral'
    ]
  },
  {
    key: 'dataNascimento',
    label: 'Data de nascimento',
    type: 'date',
    priority: 8,
    patterns: [
      'data de nascimento', 'data nascimento', 'birth date', 'date of birth',
      'nascimento', 'birth', 'dt_nascimento', 'dtnasc',
      'data_nasc', 'nascimento', 'data_nascimento'
    ]
  },
  {
    key: 'genero',
    label: 'Gênero',
    type: 'select',
    priority: 5,
    patterns: [
      'genero', 'gênero', 'sexo', 'gender', 'sex',
      'identidade de genero', 'identidade de gênero'
    ]
  },
  {
    key: 'raca',
    label: 'Raça / Cor / Etnia',
    type: 'select',
    priority: 5,
    patterns: [
      'raca', 'raça', 'cor', 'etnia', 'ethnicity', 'race',
      'cor da pele', 'grupo racial'
    ]
  },
  {
    key: 'pcd',
    label: 'Pessoa com Deficiência (PCD)',
    type: 'checkbox',
    priority: 6,
    patterns: [
      'pcd', 'deficiencia', 'deficiência', 'disability',
      'pessoa com deficiencia', 'pessoa com deficiência',
      'possui deficiencia', 'possui deficiência',
      'tipo de deficiencia', 'tipo de deficiência'
    ]
  },

  // ─── ENDEREÇO ────────────────────────────────────────────────────
  {
    key: 'cep',
    label: 'CEP',
    type: 'text',
    priority: 7,
    patterns: [
      'cep', 'postal code', 'zip code', 'codigo postal',
      'nr_cep', 'cep_residencia'
    ]
  },
  {
    key: 'endereco',
    label: 'Endereço',
    type: 'text',
    priority: 7,
    patterns: [
      'endereco', 'endereço', 'address', 'logradouro',
      'rua', 'avenida', 'av', 'endereco_residencial',
      'endereco_completo'
    ]
  },
  {
    key: 'cidade',
    label: 'Cidade',
    type: 'text',
    priority: 7,
    patterns: [
      'cidade', 'city', 'municipio', 'município',
      'cidade_residencia'
    ]
  },
  {
    key: 'estado',
    label: 'Estado',
    type: 'text',
    priority: 7,
    patterns: [
      'estado', 'state', 'uf', 'unidade federativa',
      'regiao', 'região'
    ]
  },
  {
    key: 'pais',
    label: 'País',
    type: 'text',
    priority: 7,
    patterns: [
      'país', 'pais', 'country', 'país de residência',
      'country of residence', 'what country', 'nacionalidade',
      'nationality', 'onde você mora', 'where do you live',
      'residence country', 'país onde reside',
      'country_select', 'country_dropdown', 'country_id',
      'país onde mora', 'país de origem', 'country of origin',
      'resident country', 'pais_residencia', 'country_residence',
      'current country', 'país atual'
    ]
  },

  // ─── REDES E PORTFÓLIO ──────────────────────────────────────────
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    priority: 8,
    patterns: [
      'linkedin', 'linked in', 'linked_in', 'linkedin url',
      'linkedin profile', 'perfil linkedin',
      'linkedin_url', 'linkedin.com', 'linkedIn',
      'linked in url', 'url do linkedin', 'linkedin link',
      'linkedin_id'
    ]
  },
  {
    key: 'portfolio',
    label: 'Portfólio / Website',
    type: 'url',
    priority: 7,
    patterns: [
      'portfolio', 'portfólio', 'portifolio', 'website',
      'site', 'url', 'site pessoal', 'personal site',
      'pagina pessoal', 'pagina web',
      'company website', 'company_website', 'companywebsite',
      'website url', 'personal website', 'website_url',
      'site url', 'web site', 'pagina web pessoal',
      'meu site'
    ]
  },
  {
    key: 'github',
    label: 'GitHub',
    type: 'url',
    priority: 5,
    patterns: [
      'github', 'git hub', 'github url', 'github.com',
      'perfil github', 'github profile'
    ]
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    type: 'url',
    priority: 5,
    patterns: [
      'twitter', 'x url', 'x.com', 'twitter url',
      'twitter profile', 'perfil twitter', 'perfil do twitter',
      'x_twitter', 'x_profile', 'x_url', 'xurl',
      'twitter.com', 'perfil do x', 'x account',
      'x_twitter_url', 'social media x'
    ]
  },

  // ─── VAGA E DISPONIBILIDADE ─────────────────────────────────────
  {
    key: 'pretensaoSalarial',
    label: 'Pretensão salarial',
    type: 'text',
    priority: 8,
    patterns: [
      'pretensao salarial', 'pretensão salarial', 'salary expectation',
      'salario pretendido', 'salário pretendido', 'pretensao',
      'expectativa salarial', 'expectativa de salario',
      'faixa salarial', 'pretensao_salarial',
      'salary', 'pretensao remuneratoria'
    ]
  },
  {
    key: 'disponibilidade',
    label: 'Disponibilidade / Início',
    type: 'text',
    priority: 7,
    patterns: [
      'disponibilidade', 'disponivel', 'inicio', 'início',
      'availability', 'data de inicio', 'quando pode comecar',
      'disponibilidade para inicio', 'tempo de aviso',
      'aviso previo', 'aviso prévio'
    ]
  },

  // ─── FORMAÇÃO ────────────────────────────────────────────────────
  {
    key: 'escolaridade',
    label: 'Escolaridade / Formação',
    type: 'select',
    priority: 7,
    patterns: [
      'escolaridade', 'formacao', 'formação', 'education',
      'nivel de escolaridade', 'nível de escolaridade',
      'grau de instrucao', 'grau de instrução',
      'ensino', 'nivel academico', 'nível acadêmico'
    ]
  },
  {
    key: 'curso',
    label: 'Curso / Graduação',
    type: 'text',
    priority: 6,
    patterns: [
      'curso', 'course', 'graduacao', 'graduação',
      'formacao academica', 'formação acadêmica',
      'qual curso', 'nome do curso'
    ]
  },
  {
    key: 'instituicao',
    label: 'Instituição de Ensino',
    type: 'text',
    priority: 5,
    patterns: [
      'instituicao', 'instituição', 'institution',
      'universidade', 'university', 'faculdade',
      'ies', 'instituicao de ensino',
      'nome da instituicao', 'nome da faculdade'
    ]
  },

  // ─── EXPERIÊNCIA E COMPLEMENTO ──────────────────────────────────
  {
    key: 'resumoProfissional',
    label: 'Resumo profissional / Sobre você',
    type: 'textarea',
    priority: 8,
    patterns: [
      'resumo profissional', 'resumo', 'summary', 'about',
      'sobre voce', 'sobre você', 'sobre',
      'conte sobre voce', 'conte sobre você',
      'apresentacao', 'apresentação', 'professional summary',
      'biografia', 'bio', 'descricao pessoal'
    ]
  },
  {
    key: 'comoSoube',
    label: 'Como soube da vaga',
    type: 'select',
    priority: 5,
    patterns: [
      'como soube', 'como soube da vaga', 'indicacao', 'indicação',
      'fonte', 'source', 'how did you hear',
      'onde encontrou', 'onde viu a vaga',
      'linkedin', 'instagram', 'facebook', 'indeed',
      'site da empresa', 'divulgacao'
    ]
  },

  // ─── CURRÍCULO (UPLOAD) ─────────────────────────────────────────
  {
    key: 'curriculo',
    label: 'Currículo (upload)',
    type: 'file',
    priority: 9,
    patterns: [
      'curriculo', 'currículo', 'resume', 'cv',
      'upload curriculo', 'upload de curriculo',
      'anexar curriculo', 'anexar currículo',
      'arquivo', 'file', 'documento',
      'curriculo.pdf', 'attachment'
    ]
  }
];

// Mapa auxiliar: key → entry
const FIELD_MAP = Object.fromEntries(
  FIELD_DICTIONARY.map(e => [e.key, e])
);

// Export para uso nos content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_DICTIONARY, FIELD_MAP };
}
