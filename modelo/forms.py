from django import forms
from .models import *

TIPO_CHOICES = (
    ('F', 'Funcionario'),
    ('G', 'Gerente'),
)
DESCRICAO_CHOICES = (

    ('I', 'Inativo'),
    ('A', 'Ativo'),

)

class EstoqueForm(forms.ModelForm):

    class Meta:
        model = Estoque
        fields = ('nome','marca','preco','quant_produtos','minimo','pontos',)

class FuncionarioForm(forms.Form):

    tipo_funcionario = forms.ChoiceField(choices=TIPO_CHOICES,widget=forms.Select(attrs={'class':'Dropdown'}))
    situacao = forms.ChoiceField(choices=DESCRICAO_CHOICES)


class UsuarioForm(forms.ModelForm):

    class Meta:
        model = Usuario
        fields = ('nome','sobrenome','email','cpf',)
        exclude = ('login','senha','endereco','telefone',)

class TelefoneForm(forms.ModelForm):

    class Meta:
        model = Telefone
        fields = ('ddd1','numero1','ddd2','numero2',)

class EnderecoForm(forms.ModelForm):

    class Meta:

        model = Endereco
        fields = ('rua','numero_casa','complemento','bairro','cep','cidade',)

class TipofuncionarioForm(forms.ModelForm):

    class Meta:

        model = Tipofuncionario
        fields = ('desc_tipo',)

class SituacaoForm(forms.ModelForm):

    class Meta:

        model = Situacao
        fields = ('descricao',)

class ClienteForm(forms.ModelForm):

    class Meta:
        model = Cliente
        fields = ('max_pontos',)
        exclude = ('usuario','cartao',)

class CartaoForm(forms.ModelForm):

    class Meta:
        model = Cartao
        fields = ('quant_pontos',)

class LoginForm (forms.ModelForm):
    class Meta:
        model = Usuario
        fields = ('login','senha',)
        exclude = ('nome','sobrenome','cpf','email','endereco','telefone',)

class BuscaForm (forms.Form):
    CPF = forms.CharField(max_length=11)

