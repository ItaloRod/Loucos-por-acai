# coding: utf-8
# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey has `on_delete` set to the desired behavior.
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.

from __future__ import unicode_literals
from django.contrib.auth.models import User
from django.db import models
from datetime import date


class Estoque(models.Model):

    id = models.AutoField(primary_key=True)  # AutoField?
    nome = models.CharField(max_length=100)
    marca = models.CharField(max_length=100)
    preco = models.FloatField()  # This field type is a guess.
    quant_produtos = models.IntegerField(null=True)
    minimo = models.IntegerField()
    pontos = models.IntegerField(blank=True, null=True)

    class Meta:

        db_table = 'modelo_estoque'

class Endereco(models.Model):

    id = models.AutoField(primary_key=True)  # AutoField?
    rua = models.CharField(max_length=100)
    numero_casa = models.IntegerField()
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=100)
    cep = models.IntegerField()
    cidade = models.CharField(max_length=100)

    class Meta:
        db_table = 'modelo_endereco'

class Telefone(models.Model):

    id = models.AutoField(primary_key=True)  # AutoField?
    ddd1 = models.IntegerField()
    numero1 = models.CharField(max_length=15,)
    ddd2 = models.IntegerField(blank=True, null=True)
    numero2 = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        db_table = 'modelo_telefone'

class Usuario(models.Model):

    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=45)
    sobrenome = models.CharField(max_length=45)
    cpf = models.CharField(max_length=14, null=False, unique=True)
    login = models.CharField(max_length=45, null=True)
    senha = models.CharField(max_length=45, null=True)
    email = models.CharField(max_length=45)
    endereco = models.ForeignKey(Endereco, on_delete=models.CASCADE, blank=True, null=False)
    telefone = models.ForeignKey(Telefone, on_delete=models.CASCADE, blank=True, null=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, default=1)

    class Meta:
        db_table = 'modelo_usuario'

    def isCliente(self):

        user = self.user
        groups = user.groups
        for group in user.groups.all():
            if group.name == 'cliente':
                return True
            return False


    def isFuncionario(self):
        user = self.user
        groups = user.groups
        for group in user.groups.all():
            if group.name == 'funcionario':
                return True
            return False

    def isGerente(self):

        user = self.user
        groups = user.groups
        for group in user.groups.all():
            if group.name == 'gerente':
                return True
            return False


class Cartao(models.Model):

    id = models.AutoField(primary_key=True)  # AutoField?
    quant_pontos = models.IntegerField()

    class Meta:
        db_table = 'modelo_cartao'


class Cliente(models.Model):

    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, blank=True, null=False)
    cartao = models.ForeignKey(Cartao, on_delete=models.CASCADE, blank=True, null=False)
    max_pontos = models.IntegerField(null=True)

    class Meta:
        db_table = 'modelo_cliente'


class Situacao(models.Model):

    id = models.AutoField(primary_key=True)  # AutoField?
    descricao = models.CharField(max_length=45, null=False)

    class Meta:
        db_table = 'modelo_situacao'


class Tipofuncionario(models.Model):


    id = models.AutoField(primary_key=True)  # AutoField?
    desc_tipo = models.CharField(max_length=45, null=False)

    class Meta:
        db_table = 'modelo_tipoFuncionario'

class Funcionario (models.Model):

    id = models.AutoField(primary_key=True)
    salario = models.FloatField()
    periodo_trabalho = models.CharField(max_length=45)

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, blank=True, null=False)
    tipo_funcionario = models.ForeignKey(Tipofuncionario, on_delete=models.CASCADE, blank=True, null=False)
    situacao = models.ForeignKey(Situacao, on_delete=models.CASCADE, blank=True, null=False)

    class Meta:
        db_table = 'modelo_funcionario'


class Carrinho(models.Model):

    estoque = models.ManyToManyField(Estoque, blank=True)
    valor_Total = models.FloatField(default=0)

    class Meta:
        db_table = 'modelo_carrinho'

class Atendimento(models.Model):

    id = models.AutoField(primary_key=True)
    data_compra = models.DateField(default=date.today)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE, blank=True, null=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, blank=True, null=False)
    carrinho = models.ForeignKey(Carrinho, on_delete=models.CASCADE, blank=True, null=True)

    class Meta:
        db_table = 'modelo_atendimento'

class Trocapontos(models.Model):

    id = models.AutoField(primary_key=True)
    pontos_gastos = models.IntegerField()
    data = models.DateField('Data da troca')
    hora = models.CharField(max_length=45)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE, blank=True, null=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, blank=True, null=False)
    estoque = models.ForeignKey(Estoque, on_delete=models.CASCADE, blank=True, null=False)

    class Meta:
        db_table = 'modelo_trocapontos'


#Metodos Estaticos

def getUsuarioByCpf(cpf):
    usuario = Usuario.objects.get(cpf=cpf)
    return usuario

def getProdutoById(id):
    return Estoque.objects.get(id=id)

def getFuncionarioByUser(user):
    usuario = Usuario.objects.get(user = user)
    funcionario = Funcionario.objects.get(usuario = usuario)
    return funcionario

def getClienteByUser(user):
    usuario = Usuario.objects.get(user=user)
    cliente = Cliente.objects.get(usuario=usuario)
    return cliente
